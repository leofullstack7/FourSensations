import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  canonicalExternalRef,
  canonicalVariantGroupCode,
  variantGroupCodesMatch,
} from "@/lib/bulk-import/variant-group-code";
import {
  CatalogActions,
  CatalogEntities,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tope alto: el cuello de botella real era la transacción, no Zod. */
const MAX_GROUP_SIZE = 500;
const UPDATE_CHUNK = 40;

const schema = z.object({
  primaryId: z.string().min(1),
  /** Productos “cara” o sueltos seleccionados; el servidor expande a todas las variantes de sus grupos. */
  ids: z
    .array(z.string().min(1))
    .min(2, "Selecciona al menos 2 productos")
    .max(MAX_GROUP_SIZE, `Puedes seleccionar hasta ${MAX_GROUP_SIZE} productos a la vez`),
});

function groupCodeForPrimary(p: {
  id: string;
  variantGroupCode: string | null;
  externalRef: string | null;
}): string {
  const existing = canonicalVariantGroupCode(p.variantGroupCode);
  if (existing) return existing;
  const ref = canonicalExternalRef(p.externalRef);
  if (ref) return ref;
  return `vg-${p.id.replace(/-/g, "").slice(0, 16)}`;
}

async function updateOrdersInChunks(
  tx: {
    product: {
      update: (args: {
        where: { id: string };
        data: { variantGroupCode: string; variantGroupOrder: number };
      }) => Promise<unknown>;
    };
  },
  items: Array<{ id: string; order: number }>,
  groupCode: string,
) {
  for (let i = 0; i < items.length; i += UPDATE_CHUNK) {
    const chunk = items.slice(i, i + UPDATE_CHUNK);
    await Promise.all(
      chunk.map((item) =>
        tx.product.update({
          where: { id: item.id },
          data: { variantGroupCode: groupCode, variantGroupOrder: item.order },
        }),
      ),
    );
  }
}

type SeedRow = {
  id: string;
  name: string;
  variantGroupCode: string | null;
  externalRef: string | null;
  variantGroupOrder: number | null;
};

/**
 * Expande la selección: si un producto pertenece a un grupo de variantes,
 * incluye a todos los hermanos de ese grupo.
 */
async function expandToAllVariantMembers(seedIds: string[]): Promise<SeedRow[]> {
  const seeds = await prisma.product.findMany({
    where: { id: { in: seedIds } },
    select: {
      id: true,
      name: true,
      variantGroupCode: true,
      externalRef: true,
      variantGroupOrder: true,
    },
  });
  if (seeds.length !== seedIds.length) {
    throw new Error("MISSING_PRODUCTS");
  }

  const groupCodes = Array.from(
    new Set(
      seeds
        .map((s) => canonicalVariantGroupCode(s.variantGroupCode))
        .filter((c): c is string => Boolean(c)),
    ),
  );

  if (groupCodes.length === 0) {
    return seeds;
  }

  // Traer posibles hermanos (códigos exactos + coincidencia canónica por si hay variantes de formato).
  const candidates = await prisma.product.findMany({
    where: {
      OR: [
        { variantGroupCode: { in: groupCodes } },
        {
          variantGroupCode: {
            in: Array.from(
              new Set(seeds.map((s) => s.variantGroupCode?.trim()).filter((c): c is string => Boolean(c))),
            ),
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      variantGroupCode: true,
      externalRef: true,
      variantGroupOrder: true,
    },
  });

  const byId = new Map<string, SeedRow>();
  for (const s of seeds) byId.set(s.id, s);
  for (const row of candidates) {
    const code = canonicalVariantGroupCode(row.variantGroupCode);
    if (!code) continue;
    if (!groupCodes.some((gc) => variantGroupCodesMatch(gc, code))) continue;
    byId.set(row.id, row);
  }

  return Array.from(byId.values());
}

/**
 * Agrupa productos seleccionados como variantes.
 * Si alguno ya pertenece a un grupo, fusiona también todas sus variantes hermanas.
 * `primaryId` queda como cara principal (variantGroupOrder = 0).
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Selecciona al menos 2 productos" },
      { status: 400 },
    );
  }

  const seedIds = Array.from(new Set(parsed.data.ids));
  const { primaryId } = parsed.data;
  if (!seedIds.includes(primaryId)) {
    return NextResponse.json({ error: "La cara principal debe estar en la selección" }, { status: 400 });
  }
  if (seedIds.length < 2) {
    return NextResponse.json({ error: "Selecciona al menos 2 productos distintos" }, { status: 400 });
  }

  try {
    let members: SeedRow[];
    try {
      members = await expandToAllVariantMembers(seedIds);
    } catch (e) {
      if (e instanceof Error && e.message === "MISSING_PRODUCTS") {
        return NextResponse.json({ error: "Uno o más productos no existen" }, { status: 404 });
      }
      throw e;
    }

    if (members.length > MAX_GROUP_SIZE) {
      return NextResponse.json(
        {
          error: `Al unir los grupos quedarían ${members.length} variantes (máximo ${MAX_GROUP_SIZE}). Reduce la selección.`,
        },
        { status: 400 },
      );
    }

    const primary = members.find((r) => r.id === primaryId);
    if (!primary) {
      return NextResponse.json({ error: "Producto principal no encontrado" }, { status: 404 });
    }

    const groupCode = groupCodeForPrimary(primary);

    // Orden: cara principal = 0; luego el resto respetando orden previo dentro de cada grupo viejo.
    const others = members
      .filter((r) => r.id !== primaryId)
      .sort(
        (a, b) =>
          (a.variantGroupOrder ?? 9999) - (b.variantGroupOrder ?? 9999) ||
          a.name.localeCompare(b.name, "es"),
      );

    const orderItems = [
      { id: primaryId, order: 0 },
      ...others.map((r, i) => ({ id: r.id, order: i + 1 })),
    ];

    const oldCodes = Array.from(
      new Set(
        members
          .map((r) => canonicalVariantGroupCode(r.variantGroupCode))
          .filter((c): c is string => Boolean(c) && c !== groupCode),
      ),
    );

    await prisma.$transaction(
      async (tx) => {
        await updateOrdersInChunks(tx, orderItems, groupCode);

        for (const code of oldCodes) {
          const leftover = await tx.product.findMany({
            where: { variantGroupCode: code },
            select: { id: true, variantGroupCode: true },
          });
          const stillOnOld = leftover.filter((x) =>
            variantGroupCodesMatch(x.variantGroupCode, code),
          );
          // Tras el merge no deberían quedar miembros en el código viejo; limpiar huérfanos por si acaso.
          if (stillOnOld.length > 0 && stillOnOld.length < 2) {
            await tx.product.updateMany({
              where: { id: { in: stillOnOld.map((x) => x.id) } },
              data: { variantGroupCode: null, variantGroupOrder: null },
            });
          }
        }
      },
      {
        maxWait: 20_000,
        timeout: 120_000,
      },
    );

    revalidateStorefrontProducts();
    await recordCatalogVersionSafe({
      label: `Variantes unidas: ${primary.name}`,
      summary: `Se unieron ${seedIds.length} selección(es) en un solo grupo de ${members.length} variante(s). Cara principal: ${primary.name}.`,
      changes: [
        {
          entityType: CatalogEntities.PRODUCT,
          entityId: primaryId,
          action: CatalogActions.UPDATE,
          label: `Fusión de grupos de variantes (${members.length})`,
          beforeData: { bulk: true, selectedCount: seedIds.length },
          afterData: {
            bulk: true,
            variantGroupCode: groupCode,
            primaryId,
            memberCount: members.length,
            selectedCount: seedIds.length,
          },
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      grouped: members.length,
      selected: seedIds.length,
      variantGroupCode: groupCode,
      primaryId,
      primaryName: primary.name,
    });
  } catch (e) {
    console.error("[POST /api/admin/products/group-variants]", e);
    const msg = e instanceof Error ? e.message : "Error desconocido";
    const timedOut =
      msg.toLowerCase().includes("timeout") ||
      msg.toLowerCase().includes("timed out") ||
      msg.includes("P2028");
    return NextResponse.json(
      {
        error: timedOut
          ? "La agrupación tardó demasiado. Intenta con menos productos o reintenta en unos segundos."
          : "No se pudieron agrupar las variantes. Reintenta; si sigue fallando, avisa con cuántos productos seleccionaste.",
        ...(process.env.NODE_ENV === "development" && { detail: msg.slice(0, 400) }),
      },
      { status: 500 },
    );
  }
}
