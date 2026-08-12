import type { Metadata } from "next";
import { HeaderArcPrototype } from "@/components/lab/HeaderArcPrototype";
import { StoreCatalogSeed } from "@/components/store/StoreCatalogSeed";
import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { StorefrontShell } from "@/components/store/StorefrontShell";
import { getStorefrontProducts } from "@/lib/products";
import { getActiveStoreCombos } from "@/lib/server/store-combos";
import { getStorefrontCategoryMenu } from "@/lib/store-categories";
import { getTintBubbleItems } from "@/lib/tints";
import "./header-arco-lab.css";

export const metadata: Metadata = {
  title: "Lab · Header arco | GinnaBeauty",
  robots: { index: false, follow: false },
};

export const revalidate = 300;

/**
 * Prototipo A/B: header con arco + mismas secciones del home.
 * No reemplaza `/` — el home de producción sigue intacto.
 */
export default async function HeaderArcoLabPage() {
  const [products, tintItems, combos, menuPayload] = await Promise.all([
    getStorefrontProducts(),
    getTintBubbleItems(),
    getActiveStoreCombos(),
    getStorefrontCategoryMenu(),
  ]);

  return (
    <StorefrontShell
      hideNavChrome
      catalogProducts={products}
      initialMenuConfig={menuPayload.config}
      categorySlugByName={menuPayload.slugByCategoryName}
    >
      <HeaderArcPrototype>
        <StoreCatalogSeed products={products} />
        <StoreHomeClient tintItems={tintItems} initialProducts={products} initialCombos={combos} />
      </HeaderArcPrototype>
    </StorefrontShell>
  );
}
