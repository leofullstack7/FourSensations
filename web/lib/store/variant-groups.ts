import type { StoreProduct } from "@/lib/types/product";
import {
  canonicalVariantGroupCode,
  variantGroupCodesMatch,
} from "@/lib/bulk-import/variant-group-code";

/** Cantidad de variantes activas por código de grupo. */
export function buildVariantCountByGroup(products: StoreProduct[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products) {
    const code = canonicalVariantGroupCode(p.variantGroupCode);
    if (!code) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
}

/** Variante principal del grupo (menor variantGroupOrder). */
export function buildPrimaryVariantByGroup(products: StoreProduct[]): Map<string, StoreProduct> {
  const primaries = new Map<string, StoreProduct>();
  for (const p of products) {
    const code = canonicalVariantGroupCode(p.variantGroupCode);
    if (!code) continue;
    const existing = primaries.get(code);
    if (!existing) {
      primaries.set(code, p);
      continue;
    }
    const orderA = p.variantGroupOrder ?? 9999;
    const orderB = existing.variantGroupOrder ?? 9999;
    if (orderA < orderB) primaries.set(code, p);
  }
  return primaries;
}

export function listStorefrontVariantsInGroup(
  products: StoreProduct[],
  variantGroupCode: string
): StoreProduct[] {
  return products
    .filter((p) => variantGroupCodesMatch(p.variantGroupCode, variantGroupCode))
    .sort(
      (a, b) =>
        (a.variantGroupOrder ?? 9999) - (b.variantGroupOrder ?? 9999) ||
        a.name.localeCompare(b.name, "es")
    );
}

export function isPrimaryVariantInGroup(
  product: StoreProduct,
  primaryByGroup: Map<string, StoreProduct>
): boolean {
  const code = canonicalVariantGroupCode(product.variantGroupCode);
  if (!code) return true;
  return primaryByGroup.get(code)?.id === product.id;
}

/** Una tarjeta por grupo en listados; productos sin grupo se mantienen. */
export function collapseProductsForStorefrontList(products: StoreProduct[]): StoreProduct[] {
  const primaryByGroup = buildPrimaryVariantByGroup(products);
  return products.filter((p) => isPrimaryVariantInGroup(p, primaryByGroup));
}

/**
 * Colapsa variantes para mostrar una tarjeta por grupo.
 * Si la variante principal aún no está cargada en el catálogo parcial, muestra la variante que sí coincide.
 */
export function resolveStorefrontDisplayAfterFilter(
  matchedProducts: StoreProduct[],
  allProducts: StoreProduct[]
): StoreProduct[] {
  if (matchedProducts.length === 0) return [];

  const primaryByGroup = buildPrimaryVariantByGroup(allProducts);
  const loadedIds = new Set(allProducts.map((p) => p.id));
  const out: StoreProduct[] = [];
  const seenGroup = new Set<string>();
  const seenSolo = new Set<string>();

  for (const p of matchedProducts) {
    const code = canonicalVariantGroupCode(p.variantGroupCode);
    if (!code) {
      if (seenSolo.has(p.id)) continue;
      seenSolo.add(p.id);
      out.push(p);
      continue;
    }

    if (seenGroup.has(code)) continue;
    seenGroup.add(code);

    const primary = primaryByGroup.get(code);
    const row = primary && loadedIds.has(primary.id) ? primary : p;
    out.push(row);
  }

  return out;
}

/** Añade `variantCount` a tarjetas representantes de un grupo (≥ 2 variantes). */
export function enrichStorefrontDisplayProducts(
  displayRows: StoreProduct[],
  allProducts: StoreProduct[]
): StoreProduct[] {
  const counts = buildVariantCountByGroup(allProducts);
  return displayRows.map((p) => {
    const code = canonicalVariantGroupCode(p.variantGroupCode);
    if (!code) return p;
    const count = counts.get(code) ?? 1;
    return count >= 2 ? { ...p, variantCount: count } : p;
  });
}
