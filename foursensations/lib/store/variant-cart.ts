import type { StoreProduct } from "@/lib/types/product";
import { listStorefrontVariantsInGroup } from "@/lib/store/variant-groups";
import { normalizeColorHex } from "@/lib/product-color";

/** El producto tiene varias variantes/colores y el cliente debe elegir una. */
export function productNeedsVariantSelection(
  product: StoreProduct,
  catalog: StoreProduct[] = [],
): boolean {
  if (product.variantColors && product.variantColors.length >= 2) return true;
  if ((product.variantCount ?? 0) >= 2) return true;
  const code = product.variantGroupCode?.trim();
  if (!code) return false;
  const siblings = listStorefrontVariantsInGroup(catalog, code);
  if (siblings.length < 2) return false;
  const colored = siblings.filter((s) => normalizeColorHex(s.colorHex));
  return colored.length >= 2 || siblings.length >= 2;
}

export function formatProductVariantLabel(product: Pick<StoreProduct, "colorName" | "colorHex">): string | null {
  const name = product.colorName?.trim();
  if (name) return name;
  const hex = normalizeColorHex(product.colorHex);
  return hex;
}

export function formatOrderLineName(
  product: Pick<StoreProduct, "name" | "colorName" | "colorHex">,
): string {
  const variant = formatProductVariantLabel(product);
  if (!variant) return product.name;
  if (product.name.toLowerCase().includes(variant.toLowerCase())) return product.name;
  return `${product.name} · ${variant}`;
}
