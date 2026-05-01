import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { getStorefrontProducts } from "@/lib/products";
import { getStorefrontCategoryMenu } from "@/lib/store-categories";

/**
 * ISR 5 min: catálogo vía getStorefrontProducts (unstable_cache); no forzar dynamic en cada visita.
 */
export const revalidate = 300;

export default async function StoreHomePage() {
  const [products, menuPayload] = await Promise.all([
    getStorefrontProducts(),
    getStorefrontCategoryMenu(),
  ]);
  return (
    <StoreHomeClient
      initialProducts={products}
      initialMenuConfig={menuPayload.config}
      categorySlugByName={menuPayload.slugByCategoryName}
    />
  );
}
