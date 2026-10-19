import type { StoreProduct } from "@/lib/types/product";
import {
  canonicalVariantGroupCode,
  variantGroupCodesMatch,
} from "@/lib/bulk-import/variant-group-code";
import { normalizeColorHex } from "@/lib/product-color";

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
 * Solo usa la variante principal si también pasó el filtro; si no, muestra la
 * variante que sí coincide (evita que un producto de otra marca/familia
 * “herede” la tarjeta del grupo).
 */
export function resolveStorefrontDisplayAfterFilter(
  matchedProducts: StoreProduct[],
  allProducts: StoreProduct[]
): StoreProduct[] {
  if (matchedProducts.length === 0) return [];

  const primaryByGroup = buildPrimaryVariantByGroup(allProducts);
  const loadedIds = new Set(allProducts.map((p) => p.id));
  const matchedIds = new Set(matchedProducts.map((p) => p.id));
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
    if (primary && matchedIds.has(primary.id) && loadedIds.has(primary.id)) {
      out.push(primary);
      continue;
    }

    const matchedInGroup = matchedProducts
      .filter((m) => variantGroupCodesMatch(m.variantGroupCode, code))
      .sort(
        (a, b) =>
          (a.variantGroupOrder ?? 9999) - (b.variantGroupOrder ?? 9999) ||
          a.name.localeCompare(b.name, "es"),
      );
    out.push(matchedInGroup[0] ?? p);
  }

  return out;
}

/** Colores únicos del grupo, en orden de variante. */
export function buildVariantColorsForGroup(
  products: StoreProduct[],
  variantGroupCode: string
): { hex: string; name?: string | null }[] {
  const seen = new Set<string>();
  const colors: { hex: string; name?: string | null }[] = [];
  for (const v of listStorefrontVariantsInGroup(products, variantGroupCode)) {
    const hex = normalizeColorHex(v.colorHex);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    colors.push({ hex, name: v.colorName?.trim() || null });
  }
  return colors;
}

/** Añade `variantCount` y `variantColors` a tarjetas representantes de un grupo. */
export function enrichStorefrontDisplayProducts(
  displayRows: StoreProduct[],
  allProducts: StoreProduct[]
): StoreProduct[] {
  const counts = buildVariantCountByGroup(allProducts);
  return displayRows.map((p) => {
    const code = canonicalVariantGroupCode(p.variantGroupCode);
    if (!code) {
      const hex = normalizeColorHex(p.colorHex);
      return hex
        ? { ...p, variantColors: [{ hex, name: p.colorName?.trim() || null }] }
        : p;
    }
    const count = counts.get(code) ?? 1;
    const variantColors = buildVariantColorsForGroup(allProducts, code);
    return {
      ...p,
      ...(count >= 2 ? { variantCount: count } : {}),
      ...(variantColors.length > 0 ? { variantColors } : {}),
    };
  });
}
