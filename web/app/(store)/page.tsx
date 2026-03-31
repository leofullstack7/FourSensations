import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { getStorefrontProducts } from "@/lib/products";
import { getStorefrontCategoryMenu } from "@/lib/store-categories";

/** Catálogo y orden «destacados» vienen de DB; evita HTML estático desactualizado. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
