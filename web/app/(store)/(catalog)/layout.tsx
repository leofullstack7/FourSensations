import { StorefrontShell } from "@/components/store/StorefrontShell";
import { getStorefrontCategoryMenu } from "@/lib/store-categories";

/** Solo menú en layout: el catálogo completo se carga en home o bajo demanda (búsqueda). */
export const revalidate = 300;

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const menuPayload = await getStorefrontCategoryMenu();

  return (
    <StorefrontShell
      catalogProducts={[]}
      initialMenuConfig={menuPayload.config}
      categorySlugByName={menuPayload.slugByCategoryName}
    >
      {children}
    </StorefrontShell>
  );
}
