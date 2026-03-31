import { notFound } from "next/navigation";
import { CategoryLandingClient } from "@/components/store/CategoryLandingClient";
import { getStorefrontProducts } from "@/lib/products";
import { getMenuCategoryBySlug } from "@/lib/menu-config";
import { catKeyFromDisplayName } from "@/lib/category-labels";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: { slug: string };
  searchParams?: { sub?: string; tag?: string };
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const match = getMenuCategoryBySlug(params.slug);
  if (!match) return notFound();

  const [categoryLabel, menuData] = match;
  const categoryKey = catKeyFromDisplayName(categoryLabel);
  const allProducts = await getStorefrontProducts();
  const categoryProducts = allProducts.filter((p) => p.category === categoryKey);

  const menuSubcategories = Object.keys(menuData.subs);
  const dataSubcategories = Array.from(
    new Set(categoryProducts.map((p) => p.subcategory).filter(Boolean))
  );
  const subcategories = Array.from(new Set([...menuSubcategories, ...dataSubcategories]));

  const menuTags = Object.values(menuData.subs).flatMap((tags) => tags);
  const productTags = Array.from(new Set(categoryProducts.flatMap((p) => p.tags ?? [])));
  const allTags = Array.from(new Set([...menuTags, ...productTags]));
  const defaultSub = searchParams?.sub && subcategories.includes(searchParams.sub) ? searchParams.sub : "";
  const defaultTag = searchParams?.tag && allTags.includes(searchParams.tag) ? searchParams.tag : "";

  return (
    <CategoryLandingClient
      categoryLabel={categoryLabel}
      categorySlug={params.slug}
      categoryIcon={menuData.icon}
      products={categoryProducts}
      subcategories={subcategories}
      defaultSubcategory={defaultSub}
      defaultTag={defaultTag}
      menuTags={allTags}
    />
  );
}

