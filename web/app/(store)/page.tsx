import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { StorefrontShell } from "@/components/store/StorefrontShell";
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
    <StorefrontShell
      catalogProducts={products}
      initialMenuConfig={menuPayload.config}
      categorySlugByName={menuPayload.slugByCategoryName}
    >
      <StoreHomeClient />
    </StorefrontShell>
  );
}
