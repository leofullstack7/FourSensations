import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DISCOUNT_PERCENT_MAX,
  DISCOUNT_PERCENT_MIN,
  computeDiscountedPrice,
  isActiveManagedDiscount,
} from "@/lib/product-discount";
import { revalidateCategoryStorefrontProducts } from "@/lib/server/revalidate-category-storefront";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type ProductDiscountRow = {
  id: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  discountEndsAt: Date | null;
  discountBasePrice: number | null;
  category: string;
};

function discountBaseForApply(p: ProductDiscountRow): number {
  if (isActiveManagedDiscount(p) && p.discountBasePrice != null && p.discountBasePrice > 0) {
    return p.discountBasePrice;
  }
  if (p.discountBasePrice != null && p.discountBasePrice > 0 && p.discountPercent != null) {
    return p.discountBasePrice;
  }
  return Math.max(1, p.price);
}

function restorePrice(p: ProductDiscountRow): number {
  if (p.discountBasePrice != null && p.discountBasePrice > 0) return p.discountBasePrice;
  if (p.originalPrice != null && p.originalPrice > p.price) return p.originalPrice;
  return Math.max(1, p.price);
}

export async function expireDueProductDiscounts(client: DbClient = prisma, ids?: string[]) {
  const now = new Date();
  const expired = await client.product.findMany({
    where: {
      discountPercent: { not: null },
      discountEndsAt: { not: null, lte: now },
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    select: {
      id: true,
      price: true,
      originalPrice: true,
      discountPercent: true,
      discountEndsAt: true,
      discountBasePrice: true,
      category: true,
    },
  });
  for (const p of expired) {
    await client.product.update({
      where: { id: p.id },
      data: {
        price: restorePrice(p),
        originalPrice: null,
        discountPercent: null,
        discountEndsAt: null,
        discountBasePrice: null,
      },
    });
  }
  return expired;
}

export async function applyProductDiscounts(
  client: DbClient,
  rows: ProductDiscountRow[],
  percent: number,
  endsAt: Date | null,
) {
  const pct = Math.round(percent);
  if (pct < DISCOUNT_PERCENT_MIN || pct > DISCOUNT_PERCENT_MAX) {
    throw new Error(`El descuento debe estar entre ${DISCOUNT_PERCENT_MIN}% y ${DISCOUNT_PERCENT_MAX}%`);
  }
  let updated = 0;
  for (const p of rows) {
    const base = discountBaseForApply(p);
    const nextPrice = computeDiscountedPrice(base, pct);
    await client.product.update({
      where: { id: p.id },
      data: {
        price: nextPrice,
        originalPrice: base > nextPrice ? base : null,
        discountPercent: pct,
        discountEndsAt: endsAt,
        discountBasePrice: base,
      },
    });
    updated += 1;
  }
  return updated;
}

export async function removeProductDiscounts(client: DbClient, rows: ProductDiscountRow[]) {
  let updated = 0;
  for (const p of rows) {
    const hasManaged =
      p.discountPercent != null || p.discountBasePrice != null || p.discountEndsAt != null;
    const looksDiscounted = p.originalPrice != null && p.originalPrice > p.price;
    if (!hasManaged && !looksDiscounted) continue;
    await client.product.update({
      where: { id: p.id },
      data: {
        price: restorePrice(p),
        originalPrice: null,
        discountPercent: null,
        discountEndsAt: null,
        discountBasePrice: null,
      },
    });
    updated += 1;
  }
  return updated;
}

export function revalidateStorefrontAfterDiscounts(categorySlugs: string[]) {
  revalidateStorefrontProducts();
  for (const slug of new Set(categorySlugs.map((s) => s.trim()).filter(Boolean))) {
    revalidateCategoryStorefrontProducts(slug);
  }
}
