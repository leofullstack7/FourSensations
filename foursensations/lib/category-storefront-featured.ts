import type { StoreProduct } from "@/lib/types/product";

/** Productos visibles al abrir una categoría (vitrina inicial). */
export const CATEGORY_STOREFRONT_FEATURED_COUNT = 6;

export function orderCategoryProductsByFeatured(
  products: StoreProduct[],
  featuredIds: string[],
): StoreProduct[] {
  if (featuredIds.length === 0) return products;
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered: StoreProduct[] = [];
  const used = new Set<string>();

  for (const id of featuredIds) {
    const p = byId.get(id);
    if (!p) continue;
    ordered.push(p);
    used.add(id);
  }

  for (const p of products) {
    if (!used.has(p.id)) ordered.push(p);
  }

  return ordered;
}

export function defaultFeaturedProductIds(products: StoreProduct[], limit = CATEGORY_STOREFRONT_FEATURED_COUNT): string[] {
  return products.slice(0, limit).map((p) => p.id);
}

export function normalizeFeaturedProductIds(ids: string[], validIds: Set<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || !validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= CATEGORY_STOREFRONT_FEATURED_COUNT) break;
  }
  return out;
}
