import { notFound } from "next/navigation";
import { CategoryLandingClient } from "@/components/store/CategoryLandingClient";
import { TintCategoryPageBridge } from "@/components/store/tints/TintCategoryPageBridge";
import { TINTES_CATEGORY_SLUG } from "@/lib/bulk-import/tintes";
import { getStorefrontCategoryBySlug, type StoreCategoryWithSubs } from "@/lib/store-categories";
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

  let cat = await getStorefrontCategoryBySlug(slug);

  if (!cat && !process.env.DATABASE_URL) {
    cat = categoryFromStaticMenu(slug);
  }
  if (!cat) return notFound();

  if (cat.slug === TINTES_CATEGORY_SLUG) {
    return (
      <TintCategoryPageBridge
        categoryLabel={cat.name}
        categoryIcon={cat.icon ?? "🎨"}
        defaultSub={searchParams?.sub ?? ""}
      />
    );
  }

  const dbSubNames = cat.subcategories.map((s) => s.name);
  const grupoLabels = Array.from(
    new Set(cat.subcategories.map((s) => (s.menuTag?.trim() ? s.menuTag.trim() : "General"))),
  ).sort((a, b) => a.localeCompare(b, "es"));

  const matchFromList = (list: string[], value: string | undefined): string => {
    if (!value?.trim()) return "";
    const q = value.trim().toLowerCase();
    return list.find((item) => item.trim().toLowerCase() === q) ?? "";
  };

  const defaultGrupo = matchFromList(grupoLabels, searchParams?.grupo);
  const defaultSub = matchFromList(dbSubNames, searchParams?.sub);
  const defaultProductTag = searchParams?.tag?.trim() ?? "";

  return (
    <CategoryLandingClient
      categoryLabel={cat.name}
      categorySlug={cat.slug}
      categoryIcon={cat.icon ?? "📦"}
      subcategoriesFromDb={cat.subcategories.map((s) => ({
        name: s.name,
        menuTag: s.menuTag,
      }))}
      grupoLabels={grupoLabels}
      defaultGrupo={defaultGrupo}
      defaultSubcategory={defaultSub}
      defaultProductTag={defaultProductTag}
    />
  );
}
