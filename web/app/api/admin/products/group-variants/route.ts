import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  canonicalExternalRef,
  canonicalVariantGroupCode,
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
  ids: z
    .array(z.string().min(1))
    .min(2, "Selecciona al menos 2 productos")
    .max(MAX_GROUP_SIZE, `Puedes agrupar hasta ${MAX_GROUP_SIZE} productos a la vez`),
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

/**
 * Agrupa productos seleccionados como variantes.
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

  const ids = Array.from(new Set(parsed.data.ids));
  const { primaryId } = parsed.data;
  if (!ids.includes(primaryId)) {
    return NextResponse.json({ error: "La cara principal debe estar en la selección" }, { status: 400 });
  }
  if (ids.length < 2) {
    return NextResponse.json({ error: "Selecciona al menos 2 productos distintos" }, { status: 400 });
  }

  try {
    const rows = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, variantGroupCode: true, externalRef: true },
    });
    if (rows.length !== ids.length) {
      return NextResponse.json({ error: "Uno o más productos no existen" }, { status: 404 });
    }

    const primary = rows.find((r) => r.id === primaryId);
    if (!primary) {
      return NextResponse.json({ error: "Producto principal no encontrado" }, { status: 404 });
    }

    const groupCode = groupCodeForPrimary(primary);
    const others = ids.filter((id) => id !== primaryId);
    const orderItems = [
      { id: primaryId, order: 0 },
      ...others.map((id, i) => ({ id, order: i + 1 })),
    ];

    const oldCodes = Array.from(
      new Set(rows.map((r) => r.variantGroupCode?.trim()).filter((c): c is string => !!c && c !== groupCode)),
    );

    await prisma.$transaction(
      async (tx) => {
        await updateOrdersInChunks(tx, orderItems, groupCode);

        for (const code of oldCodes) {
          const leftover = await tx.product.findMany({
            where: { variantGroupCode: code },
            select: { id: true },
          });
          if (leftover.length < 2) {
            await tx.product.updateMany({
              where: { id: { in: leftover.map((x) => x.id) } },
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
      label: `Variantes: ${primary.name}`,
      summary: `Se agruparon ${ids.length} producto(s) como variantes. Cara principal: ${primary.name}.`,
      changes: [
        {
          entityType: CatalogEntities.PRODUCT,
          entityId: primaryId,
          action: CatalogActions.UPDATE,
          label: `Grupo de variantes (${ids.length})`,
          beforeData: { bulk: true },
          afterData: {
            bulk: true,
            variantGroupCode: groupCode,
            primaryId,
            memberCount: ids.length,
          },
        },
      ],
    });

    return NextResponse.json({
      ok: true,
      grouped: ids.length,
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
