import { revalidateTag } from "next/cache";

export const STOREFRONT_CATEGORY_PRODUCTS_TAG_PREFIX = "storefront-category-products";

export function categoryProductsCacheTag(categorySlug: string): string {
  return `${STOREFRONT_CATEGORY_PRODUCTS_TAG_PREFIX}-${categorySlug}`;
}

export function revalidateCategoryStorefrontProducts(categorySlug: string): void {
  revalidateTag(categoryProductsCacheTag(categorySlug));
}
