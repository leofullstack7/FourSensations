import { prisma } from "@/lib/prisma";
import type { StoreCombo } from "@/lib/types/store-combo";

type ComboFlatRow = {
  comboId: string;
  comboName: string;
  comboSlug: string;
  comboPrice: number;
  comboActive: boolean;
  itemId: string | null;
  productId: string | null;
  itemQty: number | null;
  itemSort: number | null;
  productName: string | null;
  productPrice: number | null;
  productImageUrl: string | null;
  productEmoji: string | null;
  productActive: boolean | null;
};

function groupActiveCombos(rows: ComboFlatRow[]): StoreCombo[] {
  const map = new Map<string, StoreCombo>();

  for (const r of rows) {
    if (!r.comboActive) continue;
    let c = map.get(r.comboId);
    if (!c) {
      c = {
        id: r.comboId,
        name: r.comboName,
        slug: r.comboSlug,
        comboPrice: r.comboPrice,
        retailTotal: 0,
        items: [],
      };
      map.set(r.comboId, c);
    }
    if (r.itemId && r.productId && r.productActive) {
      const qty = r.itemQty ?? 1;
      const price = r.productPrice ?? 0;
      c.items.push({
        id: r.itemId,
        quantity: qty,
        sortOrder: r.itemSort ?? 0,
        product: {
          id: r.productId,
          name: r.productName ?? "",
          price,
          imageUrl: r.productImageUrl,
          emoji: r.productEmoji,
        },
      });
      c.retailTotal += price * qty;
    }
  }

  return [...map.values()]
    .filter((c) => c.items.length > 0)
    .map((c) => ({
      ...c,
      items: [...c.items].sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

/** Combos activos con productos activos (vitrina pública). */
export async function getActiveStoreCombos(): Promise<StoreCombo[]> {
  try {
    const rows = await prisma.$queryRaw<ComboFlatRow[]>`
      SELECT
        c.id AS "comboId",
        c.name AS "comboName",
        c.slug AS "comboSlug",
        c."comboPrice" AS "comboPrice",
        c.active AS "comboActive",
        i.id AS "itemId",
        i."productId" AS "productId",
        i.quantity AS "itemQty",
        i."sortOrder" AS "itemSort",
        p.name AS "productName",
        p.price AS "productPrice",
        p."imageUrl" AS "productImageUrl",
        p.emoji AS "productEmoji",
        p.active AS "productActive"
      FROM "ProductCombo" c
      LEFT JOIN "ProductComboItem" i ON i."comboId" = c.id
      LEFT JOIN "Product" p ON p.id = i."productId"
      WHERE c.active = true
      ORDER BY c."updatedAt" DESC, i."sortOrder" ASC NULLS LAST
    `;
    return groupActiveCombos(rows);
  } catch (e) {
    console.error("[getActiveStoreCombos]", e);
    return [];
  }
}

export async function getActiveStoreComboById(comboId: string): Promise<StoreCombo | null> {
  try {
    const rows = await prisma.$queryRaw<ComboFlatRow[]>`
      SELECT
        c.id AS "comboId",
        c.name AS "comboName",
        c.slug AS "comboSlug",
        c."comboPrice" AS "comboPrice",
        c.active AS "comboActive",
        i.id AS "itemId",
        i."productId" AS "productId",
        i.quantity AS "itemQty",
        i."sortOrder" AS "itemSort",
        p.name AS "productName",
        p.price AS "productPrice",
        p."imageUrl" AS "productImageUrl",
        p.emoji AS "productEmoji",
        p.active AS "productActive"
      FROM "ProductCombo" c
      LEFT JOIN "ProductComboItem" i ON i."comboId" = c.id
      LEFT JOIN "Product" p ON p.id = i."productId"
      WHERE c.id = ${comboId} AND c.active = true
      ORDER BY i."sortOrder" ASC NULLS LAST
    `;
    return groupActiveCombos(rows)[0] ?? null;
  } catch (e) {
    console.error("[getActiveStoreComboById]", e);
    return null;
  }
}
