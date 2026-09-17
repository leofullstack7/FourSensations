import { revalidateTag } from "next/cache";
import { revalidateCategoryStorefrontProducts } from "@/lib/server/revalidate-category-storefront";

export const STOREFRONT_PRODUCTS_CACHE_TAG = "storefront-products-v6";
export const STOREFRONT_BRANDS_CACHE_TAG = "storefront-brands";
export const STOREFRONT_TINTS_CACHE_TAG = "storefront-tint-bubble-items-v1";

export function storefrontBrandCacheTag(brandSlug: string): string {
  return `storefront-brand:${brandSlug}`;
}

export function revalidateStorefrontProducts(): void {
  revalidateTag(STOREFRONT_PRODUCTS_CACHE_TAG);
}

/** Invalida catálogo, marcas, categorías afectadas y (si aplica) burbujas de tintes. */
export function revalidateStorefrontAfterBrandChange(opts: {
  brandSlugs?: string[];
  categorySlugs?: string[];
  includeTints?: boolean;
}): void {
  revalidateStorefrontProducts();
  revalidateTag(STOREFRONT_BRANDS_CACHE_TAG);
  for (const slug of opts.brandSlugs ?? []) {
    const s = slug.trim();
    if (s) revalidateTag(storefrontBrandCacheTag(s));
  }
  for (const cat of opts.categorySlugs ?? []) {
    const c = cat.trim();
    if (c) revalidateCategoryStorefrontProducts(c);
  }
  if (opts.includeTints) {
    revalidateTag(STOREFRONT_TINTS_CACHE_TAG);
  }
}
