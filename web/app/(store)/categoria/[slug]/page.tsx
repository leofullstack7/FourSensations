import { notFound } from "next/navigation";
import { CategoryLandingClient } from "@/components/store/CategoryLandingClient";
import { StorefrontShell } from "@/components/store/StorefrontShell";
import { TintCategoryPageBridge } from "@/components/store/tints/TintCategoryPageBridge";
import { TINTES_CATEGORY_SLUG } from "@/lib/bulk-import/tintes";
import { getStorefrontProducts } from "@/lib/products";
import { getStorefrontCategoryBySlug, getStorefrontCategoryMenu, type StoreCategoryWithSubs } from "@/lib/store-categories";
import { getTintBubbleItems } from "@/lib/tints";
import { getMenuCategoryBySlug } from "@/lib/menu-config";
import { slugify } from "@/lib/slugify";

/** ISR 5 min: datos de categoría/productos alineados con caché del catálogo en lib. */
export const revalidate = 300;

type Props = {
  params: { slug: string };
  searchParams?: { sub?: string; grupo?: string; tag?: string };
};

function categoryFromStaticMenu(slug: string): StoreCategoryWithSubs | null {
  const m = getMenuCategoryBySlug(slug);
  if (!m) return null;
  const [name, data] = m;
  let sortOrder = 0;
  const subcategories = Object.entries(data.subs).flatMap(([menuTag, names]) =>
    names.map((subName) => ({
      name: subName,
      menuTag,
      slug: slugify(`${menuTag}-${subName}`),
      sortOrder: sortOrder++,
    }))
  );
  return {
    id: "static",
    slug,
    name,
    icon: data.icon,
    sortOrder: 0,
    subcategories,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  let cat = await getStorefrontCategoryBySlug(params.slug);
  if (!cat && !process.env.DATABASE_URL) {
    cat = categoryFromStaticMenu(params.slug);
  }
  if (!cat) return notFound();

  const [allProducts, menuPayload] = await Promise.all([getStorefrontProducts(), getStorefrontCategoryMenu()]);

  if (cat.slug === TINTES_CATEGORY_SLUG) {
    const tintItems = await getTintBubbleItems();
    return (
      <StorefrontShell
        catalogProducts={allProducts}
        initialMenuConfig={menuPayload.config}
        categorySlugByName={menuPayload.slugByCategoryName}
      >
        <TintCategoryPageBridge
          initialItems={tintItems}
          categoryLabel={cat.name}
          categoryIcon={cat.icon ?? "🎨"}
        />
      </StorefrontShell>
    );
  }

  const categoryProducts = allProducts.filter((p) => p.category === cat.slug);

  const dbSubNames = cat.subcategories.map((s) => s.name);
  const grupoLabels = Array.from(
    new Set(
      cat.subcategories.map((s) => (s.menuTag?.trim() ? s.menuTag.trim() : "General"))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  const defaultGrupo =
    searchParams?.grupo && grupoLabels.includes(searchParams.grupo) ? searchParams.grupo : "";
  const defaultSub =
    searchParams?.sub && dbSubNames.includes(searchParams.sub) ? searchParams.sub : "";

  const productTags = Array.from(new Set(categoryProducts.flatMap((p) => p.tags ?? []))).sort((a, b) =>
    a.localeCompare(b, "es")
  );
  const defaultProductTag =
    searchParams?.tag && productTags.includes(searchParams.tag) ? searchParams.tag : "";

  return (
    <StorefrontShell
      catalogProducts={allProducts}
      initialMenuConfig={menuPayload.config}
      categorySlugByName={menuPayload.slugByCategoryName}
    >
      <CategoryLandingClient
        categoryLabel={cat.name}
        categorySlug={cat.slug}
        categoryIcon={cat.icon ?? "📦"}
        products={categoryProducts}
        subcategoriesFromDb={cat.subcategories.map((s) => ({
          name: s.name,
          menuTag: s.menuTag,
        }))}
        grupoLabels={grupoLabels}
        defaultGrupo={defaultGrupo}
        defaultSubcategory={defaultSub}
        productTagOptions={productTags}
        defaultProductTag={defaultProductTag}
      />
    </StorefrontShell>
  );
}

