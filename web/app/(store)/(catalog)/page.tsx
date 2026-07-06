import { StoreCatalogSeed } from "@/components/store/StoreCatalogSeed";
import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { getStorefrontProducts } from "@/lib/products";
import { getTintBubbleItems } from "@/lib/tints";

export const revalidate = 300;

export default async function StoreHomePage() {
  const [products, tintItems] = await Promise.all([
    getStorefrontProducts(),
    getTintBubbleItems(),
  ]);

  return (
    <>
      <StoreCatalogSeed products={products} />
      <StoreHomeClient tintItems={tintItems} initialProducts={products} />
    </>
  );
}
