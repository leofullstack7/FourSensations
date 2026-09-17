import { StorefrontShell } from "@/components/store/StorefrontShell";
import { getStorefrontCategoryMenu } from "@/lib/store-categories";
import { getStorefrontMenuProductSlugs } from "@/lib/products";

/** Solo menú en layout: el catálogo completo se carga en home o bajo demanda (búsqueda). */
export const revalidate = 300;

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const [menuPayload, menuProductSlugs] = await Promise.all([
    getStorefrontCategoryMenu(),
    getStorefrontMenuProductSlugs(),
  ]);

  return (
    <StorefrontShell
      catalogProducts={[]}
      initialMenuConfig={menuPayload.config}
      categorySlugByName={menuPayload.slugByCategoryName}
      menuProductSlugs={menuProductSlugs}
    >
      {children}
    </StorefrontShell>
  );
}
