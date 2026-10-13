import { StorefrontShell } from "@/components/store/StorefrontShell";
import { getStorefrontCategoryMenu } from "@/lib/store-categories";
import { getStorefrontMenuProductSlugs } from "@/lib/products";
import { getMegaPromoMap } from "@/lib/server/site-settings";

/** Solo menú en layout: el catálogo completo se carga en home o bajo demanda (búsqueda). */
export const revalidate = 300;

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const [menuPayload, menuProductSlugs, megaPromo] = await Promise.all([
    getStorefrontCategoryMenu(),
    getStorefrontMenuProductSlugs(),
    getMegaPromoMap(),
  ]);

  return (
    <StorefrontShell
      catalogProducts={[]}
      initialMenuConfig={menuPayload.config}
      categorySlugByName={menuPayload.slugByCategoryName}
      menuProductSlugs={menuProductSlugs}
      megaPromo={megaPromo}
    >
      {children}
    </StorefrontShell>
  );
}
