import { StoreCatalogSeed } from "@/components/store/StoreCatalogSeed";
import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { getStorefrontProducts } from "@/lib/products";
import { getActiveStoreCombos } from "@/lib/server/store-combos";
import { getTintBubbleItems } from "@/lib/tints";

export const revalidate = 300;

export default async function StoreHomePage() {
  const [products, tintItems, combos] = await Promise.all([
    getStorefrontProducts(),
    getTintBubbleItems(),
    getActiveStoreCombos(),
  ]);

  return (
    <>
      <StoreCatalogSeed products={products} />
      <StoreHomeClient tintItems={tintItems} initialProducts={products} initialCombos={combos} />
    </>
  );
}
