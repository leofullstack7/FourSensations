import type { StoreProduct } from "@/lib/types/product";

/**
 * Tope de seguridad al guardar el orden de vitrina (no es un límite de UX).
 * La admin puede ordenar todos los productos activos de la categoría.
 */
export const MAX_CATEGORY_STOREFRONT_ORDER = 2_000;

/** @deprecated Usar MAX_CATEGORY_STOREFRONT_ORDER; se mantiene por compatibilidad. */
export const CATEGORY_STOREFRONT_FEATURED_COUNT = MAX_CATEGORY_STOREFRONT_ORDER;

export function orderCategoryProductsByFeatured<T extends { id: string }>(
  products: T[],
  featuredIds: string[],
): T[] {
  if (featuredIds.length === 0) return products;
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered: T[] = [];
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

/** Orden por defecto: todos los productos en el orden ya resuelto (p. ej. nombre). */
export function defaultFeaturedProductIds<T extends { id: string }>(
  products: T[],
  limit = MAX_CATEGORY_STOREFRONT_ORDER,
): string[] {
  return products.slice(0, limit).map((p) => p.id);
}

export function normalizeFeaturedProductIds(
  ids: string[],
  validIds: Set<string>,
  max = MAX_CATEGORY_STOREFRONT_ORDER,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || !validIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}
