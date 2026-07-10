import type { AdminProduct } from "@/lib/types/admin";
import {
  canonicalVariantGroupCode,
  variantGroupCodesMatch,
} from "@/lib/bulk-import/variant-group-code";

/** Cantidad de productos por código de grupo de variantes. */
export function buildVariantCountByGroup(products: AdminProduct[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products) {
    const code = canonicalVariantGroupCode(p.variantGroupCode);
    if (!code) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
}

/** Variante principal del grupo (menor variantGroupOrder; fallback al primero encontrado). */
export function buildPrimaryVariantByGroup(products: AdminProduct[]): Map<string, AdminProduct> {
  const primaries = new Map<string, AdminProduct>();
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

export function listVariantsInGroup(
  products: AdminProduct[],
  variantGroupCode: string
): AdminProduct[] {
  return products
    .filter((p) => variantGroupCodesMatch(p.variantGroupCode, variantGroupCode))
    .sort(
      (a, b) =>
        (a.variantGroupOrder ?? 9999) - (b.variantGroupOrder ?? 9999) ||
        a.name.localeCompare(b.name, "es")
    );
}

/** ¿Es la variante representante del grupo en listados (menor variantGroupOrder)? */
export function isPrimaryVariantInGroup(
  product: AdminProduct,
  primaryByGroup: Map<string, AdminProduct>
): boolean {
  const code = canonicalVariantGroupCode(product.variantGroupCode);
  if (!code) return true;
  return primaryByGroup.get(code)?.id === product.id;
}

/**
 * Una fila por grupo en admin: solo la variante principal; productos sueltos sin grupo se mantienen.
 */
export function collapseProductsForAdminList(products: AdminProduct[]): AdminProduct[] {
  const primaryByGroup = buildPrimaryVariantByGroup(products);
  return products.filter((p) => isPrimaryVariantInGroup(p, primaryByGroup));
}

/**
 * Tras filtrar, si una variante secundaria coincide, mostrar la fila del representante del grupo.
 */
export function resolveAdminListRowsAfterFilter(
  matchedProducts: AdminProduct[],
  allProducts: AdminProduct[]
): AdminProduct[] {
  const primaryByGroup = buildPrimaryVariantByGroup(allProducts);
  const displayIds = new Set<string>();

  for (const p of matchedProducts) {
    const code = canonicalVariantGroupCode(p.variantGroupCode);
    if (!code) {
      displayIds.add(p.id);
      continue;
    }
    const primary = primaryByGroup.get(code);
    if (primary) displayIds.add(primary.id);
  }

  return collapseProductsForAdminList(allProducts).filter((p) => displayIds.has(p.id));
}

/** Miniatura del grupo en la lista: foto de la variante principal (dinámica si cambia). */
export function groupListThumbnail(
  product: AdminProduct,
  primaryByGroup: Map<string, AdminProduct>
): string | null {
  const code = canonicalVariantGroupCode(product.variantGroupCode);
  if (!code) return product.imageUrl ?? null;
  const primary = primaryByGroup.get(code);
  return primary?.imageUrl ?? product.imageUrl ?? null;
}
