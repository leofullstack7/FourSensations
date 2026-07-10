import { revalidateTag } from "next/cache";

export const STOREFRONT_PRODUCTS_CACHE_TAG = "storefront-products-v2";

export function revalidateStorefrontProducts(): void {
  revalidateTag(STOREFRONT_PRODUCTS_CACHE_TAG);
}
