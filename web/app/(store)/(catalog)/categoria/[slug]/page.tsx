import { notFound } from "next/navigation";
import { CategoryLandingClient } from "@/components/store/CategoryLandingClient";
import { TintCategoryPageBridge } from "@/components/store/tints/TintCategoryPageBridge";
import { TINTES_CATEGORY_SLUG } from "@/lib/bulk-import/tintes";
import { getStorefrontCategoryFeaturedProducts } from "@/lib/products";
import { getStorefrontCategoryBySlug, type StoreCategoryWithSubs } from "@/lib/store-categories";
import { getTintBubbleItems } from "@/lib/tints";
import { getMenuCategoryBySlug } from "@/lib/menu-config";
import { slugify } from "@/lib/slugify";

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
    })),
  );
  return {
    id: "static",
    slug,
    name,
    icon: data.icon,
    sortOrder: 0,
    storefrontFeaturedProductIds: [],
    subcategories,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const slug = params.slug;

  let [cat, featuredBundle] = await Promise.all([
    getStorefrontCategoryBySlug(slug),
    slug === TINTES_CATEGORY_SLUG
      ? Promise.resolve({ products: [], featuredIds: [], totalCount: 0 })
      : getStorefrontCategoryFeaturedProducts(slug),
  ]);

  if (!cat && !process.env.DATABASE_URL) {
    cat = categoryFromStaticMenu(slug);
  }
  if (!cat) return notFound();

  if (cat.slug === TINTES_CATEGORY_SLUG) {
    const tintItems = await getTintBubbleItems();
    return (
      <TintCategoryPageBridge
        initialItems={tintItems}
        categoryLabel={cat.name}
        categoryIcon={cat.icon ?? "🎨"}
      />
    );
  }

  const dbSubNames = cat.subcategories.map((s) => s.name);
  const grupoLabels = Array.from(
    new Set(cat.subcategories.map((s) => (s.menuTag?.trim() ? s.menuTag.trim() : "General"))),
  ).sort((a, b) => a.localeCompare(b, "es"));

  const defaultGrupo =
    searchParams?.grupo && grupoLabels.includes(searchParams.grupo) ? searchParams.grupo : "";
  const defaultSub =
    searchParams?.sub && dbSubNames.includes(searchParams.sub) ? searchParams.sub : "";

  const productTags = Array.from(
    new Set(featuredBundle.products.flatMap((p) => p.tags ?? [])),
  ).sort((a, b) => a.localeCompare(b, "es"));
  const defaultProductTag =
    searchParams?.tag && productTags.includes(searchParams.tag) ? searchParams.tag : "";

  return (
    <CategoryLandingClient
      categoryLabel={cat.name}
      categorySlug={cat.slug}
      categoryIcon={cat.icon ?? "📦"}
      featuredProducts={featuredBundle.products}
      featuredOrderIds={featuredBundle.featuredIds}
      totalProductCount={featuredBundle.totalCount}
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
  );
}
