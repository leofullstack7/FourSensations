import { StorefrontShell } from "@/components/store/StorefrontShell";
import { getStorefrontProducts } from "@/lib/products";
import { getStorefrontCategoryMenu } from "@/lib/store-categories";

/** Shell + catálogo compartidos: no se vuelven a cargar al cambiar de categoría. */
export const revalidate = 300;

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const [catalogProducts, menuPayload] = await Promise.all([
    getStorefrontProducts(),
    getStorefrontCategoryMenu(),
  ]);

  return (
    <StorefrontShell
      catalogProducts={catalogProducts}
      initialMenuConfig={menuPayload.config}
      categorySlugByName={menuPayload.slugByCategoryName}
    >
      {children}
    </StorefrontShell>
  );
}
