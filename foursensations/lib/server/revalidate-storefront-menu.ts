import { revalidateTag } from "next/cache";

export const STOREFRONT_MENU_CACHE_TAG = "storefront-category-menu-v2";

/** Invalida caché del mega menú tras cambios en categorías/subcategorías. */
export function revalidateStorefrontMenu(): void {
  revalidateTag(STOREFRONT_MENU_CACHE_TAG);
}
