import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { StoreHomeHeroPreload } from "@/components/store/StoreHomeHero";
import { isHomeClubFavoriteProduct } from "@/lib/home-club-favorites";
import { getStorefrontProducts } from "@/lib/products";
import { getActiveStoreCombos } from "@/lib/server/store-combos";
import { getHomeContentSettings } from "@/lib/server/site-settings";

export const revalidate = 300;

export default async function StoreHomePage() {
  const [allProducts, combos, homeContent] = await Promise.all([
    getStorefrontProducts(),
    getActiveStoreCombos(),
    getHomeContentSettings(),
  ]);

  // Home solo necesita favoritos + featured: sembrar el catálogo completo duplicaba RAM/HTML.
  const products = allProducts.filter(
    (p) => p.featuredInHome || isHomeClubFavoriteProduct(p.name),
  );

  return (
    <>
      <StoreHomeHeroPreload />
      <StoreHomeClient initialProducts={products} initialCombos={combos} homeContent={homeContent} />
    </>
  );
}
