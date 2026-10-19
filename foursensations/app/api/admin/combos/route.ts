import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { allocateUniqueComboSlug } from "@/lib/server/combo-slug";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  CatalogActions,
  CatalogEntities,
  loadComboSnapshot,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";
import { ensureStoreSchemaExtras } from "@/lib/server/ensure-schema";
import { ensureLaunchCategories } from "@/lib/server/ensure-launch-categories";
import { allocateUniqueProductSlug } from "@/lib/server/product-slug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreJson = (body: unknown, init?: ResponseInit) =>
  NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

const createComboSchema = z.object({
  name: z.string().trim().min(2).max(120),
  comboPrice: z.number().int().min(0).max(500_000_000),
  imageUrl: z.string().url().max(2000).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99).optional(),
        unitPrice: z.number().int().min(0).max(500_000_000).optional().nullable(),
      })
    )
    .min(1)
    .max(30),
});

type ComboFlatRow = {
  comboId: string;
  comboName: string;
  comboSlug: string;
  comboPrice: number;
  comboActive: boolean;
  comboCreatedAt: Date;
  comboUpdatedAt: Date;
  itemId: string | null;
  productId: string | null;
  itemQty: number | null;
  itemSort: number | null;
  productName: string | null;
  productPrice: number | null;
  productImageUrl: string | null;
  productEmoji: string | null;
};

function groupComboRows(rows: ComboFlatRow[]) {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      comboPrice: number;
      active: boolean;
      createdAt: string;
      updatedAt: string;
      items: Array<{
        id: string;
        quantity: number;
        sortOrder: number;
        product: {
          id: string;
          name: string;
          price: number;
          imageUrl: string | null;
          emoji: string | null;
        };
      }>;
    }
  >();

  for (const r of rows) {
    let c = map.get(r.comboId);
    if (!c) {
      c = {
        id: r.comboId,
        name: r.comboName,
        slug: r.comboSlug,
        comboPrice: r.comboPrice,
        active: r.comboActive,
        createdAt: r.comboCreatedAt.toISOString(),
        updatedAt: r.comboUpdatedAt.toISOString(),
        items: [],
      };
      map.set(r.comboId, c);
    }
    if (r.itemId && r.productId) {
      c.items.push({
        id: r.itemId,
        quantity: r.itemQty ?? 1,
        sortOrder: r.itemSort ?? 0,
        product: {
          id: r.productId,
          name: r.productName ?? "",
          price: r.productPrice ?? 0,
          imageUrl: r.productImageUrl,
          emoji: r.productEmoji,
        },
      });
    }
  }
  return [...map.values()];
}

async function loadComboRows(): Promise<ComboFlatRow[]> {
  return prisma.$queryRaw<ComboFlatRow[]>`
    SELECT
      c.id AS "comboId",
      c.name AS "comboName",
      c.slug AS "comboSlug",
      c."comboPrice" AS "comboPrice",
      c.active AS "comboActive",
      c."createdAt" AS "comboCreatedAt",
      c."updatedAt" AS "comboUpdatedAt",
      i.id AS "itemId",
      i."productId" AS "productId",
      i.quantity AS "itemQty",
      i."sortOrder" AS "itemSort",
      p.name AS "productName",
      p.price AS "productPrice",
      p."imageUrl" AS "productImageUrl",
      p.emoji AS "productEmoji"
    FROM "ProductCombo" c
    LEFT JOIN "ProductComboItem" i ON i."comboId" = c.id
    LEFT JOIN "Product" p ON p.id = i."productId"
    ORDER BY c."updatedAt" DESC, i."sortOrder" ASC NULLS LAST
  `;
}

async function loadOneComboFlat(comboId: string): Promise<ComboFlatRow[]> {
  return prisma.$queryRaw<ComboFlatRow[]>`
    SELECT
      c.id AS "comboId",
      c.name AS "comboName",
      c.slug AS "comboSlug",
      c."comboPrice" AS "comboPrice",
      c.active AS "comboActive",
      c."createdAt" AS "comboCreatedAt",
      c."updatedAt" AS "comboUpdatedAt",
      i.id AS "itemId",
      i."productId" AS "productId",
      i.quantity AS "itemQty",
      i."sortOrder" AS "itemSort",
      p.name AS "productName",
      p.price AS "productPrice",
      p."imageUrl" AS "productImageUrl",
      p.emoji AS "productEmoji"
    FROM "ProductCombo" c
    LEFT JOIN "ProductComboItem" i ON i."comboId" = c.id
    LEFT JOIN "Product" p ON p.id = i."productId"
    WHERE c.id = ${comboId}
    ORDER BY i."sortOrder" ASC NULLS LAST
  `;
}

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const rows = await loadComboRows();
    return noStoreJson({ combos: groupComboRows(rows) });
  } catch (e) {
    console.error("[GET /api/admin/combos]", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("ProductCombo") || msg.includes("does not exist") || msg.includes("relation")) {
      return noStoreJson(
        {
          error:
            "Las tablas de combos no existen en la base de datos. En la carpeta web ejecuta: npm run db:push",
        },
        { status: 500 }
      );
    }
    return noStoreJson({ error: "Error al listar combos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createComboSchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, comboPrice, items, imageUrl } = parsed.data;
  await ensureStoreSchemaExtras();
  await ensureLaunchCategories();

  const productIds = [...new Set(items.map((i) => i.productId))];
  const found = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
    select: { id: true, name: true, price: true, imageUrl: true },
  });
  if (found.length !== productIds.length) {
    return noStoreJson({ error: "Uno o más productos no existen o están inactivos" }, { status: 400 });
  }
  const byId = new Map(found.map((p) => [p.id, p]));

  try {
    const comboId = await prisma.$transaction(async (tx) => {
      const slug = await allocateUniqueComboSlug(name, tx);
      const id = randomUUID();
      const cover =
        imageUrl?.trim() ||
        items.map((i) => byId.get(i.productId)?.imageUrl).find(Boolean) ||
        null;

      let retailTotal = 0;
      const descParts: string[] = [];
      for (const line of items) {
        const p = byId.get(line.productId)!;
        const qty = line.quantity ?? 1;
        retailTotal += p.price * qty;
        descParts.push(`${qty}× ${p.name}`);
      }

      const productSlug = await allocateUniqueProductSlug(name);
      const storeProductId = randomUUID();
      await tx.product.create({
        data: {
          id: storeProductId,
          slug: productSlug,
          name: name.trim(),
          brand: "Four Sensations",
          category: "kits",
          subcategory: "Kits",
          description: `Incluye: ${descParts.join(" · ")}`,
          price: comboPrice,
          originalPrice: retailTotal > comboPrice ? retailTotal : null,
          stock: 50,
          imageUrl: cover,
          tags: ["kit", `combo:${id}`],
          emoji: "🎁",
          active: true,
        },
      });

      await tx.$executeRaw`
        INSERT INTO "ProductCombo" ("id", "name", "slug", "comboPrice", "imageUrl", "storeProductId", "active", "createdAt", "updatedAt")
        VALUES (${id}, ${name.trim()}, ${slug}, ${comboPrice}, ${cover}, ${storeProductId}, true, NOW(), NOW())
      `;
      let order = 0;
      for (const line of items) {
        const itemId = randomUUID();
        const qty = line.quantity ?? 1;
        const unit = line.unitPrice ?? null;
        await tx.$executeRaw`
          INSERT INTO "ProductComboItem" ("id", "comboId", "productId", "quantity", "sortOrder", "unitPrice")
          VALUES (${itemId}, ${id}, ${line.productId}, ${qty}, ${order++}, ${unit})
        `;
      }
      return id;
    });

    const flat = await loadOneComboFlat(comboId);
    const combos = groupComboRows(flat);
    const combo = combos[0];
    if (!combo) {
      return noStoreJson({ error: "Kit creado pero no se pudo leer de la base" }, { status: 500 });
    }
    const snap = await loadComboSnapshot(comboId);
    if (snap) {
      await recordCatalogVersionSafe({
        label: `Kit creado: ${combo.name}`,
        summary: `Se creó el kit «${combo.name}».`,
        changes: [
          {
            entityType: CatalogEntities.PRODUCT_COMBO,
            entityId: comboId,
            action: CatalogActions.CREATE,
            label: `Kit: ${combo.name}`,
            beforeData: null,
            afterData: snap,
          },
        ],
      });
    }
    return noStoreJson({ combo });
  } catch (e) {
    console.error("[POST /api/admin/combos]", e);
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("ProductCombo") || msg.includes("does not exist") || msg.includes("relation")) {
      return noStoreJson(
        {
          error:
            "Las tablas de kits no existen en la base de datos. En la carpeta web ejecuta: npm run db:push",
        },
        { status: 500 }
      );
    }
    return noStoreJson({ error: msg || "No se pudo crear el kit" }, { status: 500 });
  }
}
