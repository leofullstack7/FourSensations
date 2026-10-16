import { StoreCatalogSeed } from "@/components/store/StoreCatalogSeed";
import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { getStorefrontProducts } from "@/lib/products";
import { getActiveStoreCombos } from "@/lib/server/store-combos";
import { getHomeContentSettings } from "@/lib/server/site-settings";

export const revalidate = 300;

export default async function StoreHomePage() {
  const [products, combos, homeContent] = await Promise.all([
    getStorefrontProducts(),
    getActiveStoreCombos(),
    getHomeContentSettings(),
  ]);

  return (
    <>
      <StoreCatalogSeed products={products} />
      <StoreHomeClient initialProducts={products} initialCombos={combos} homeContent={homeContent} />
    </>
  );
}
