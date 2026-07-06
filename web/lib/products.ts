import { unstable_cache } from "next/cache";
import { mockProducts } from "@/data/mock-products";
import {
  CATEGORY_STOREFRONT_FEATURED_COUNT,
  defaultFeaturedProductIds,
  orderCategoryProductsByFeatured,
} from "@/lib/category-storefront-featured";
import { categoryProductsCacheTag } from "@/lib/server/revalidate-category-storefront";
import type { StoreProduct } from "@/lib/types/product";
import { prisma } from "@/lib/prisma";

function rowToStore(
  p: {
    id: string;
    name: string;
    brand: string;
    category: string;
    subcategory: string;
    tags: string[];
    price: number;
    originalPrice: number | null;
    rating: number;
    reviews: number;
    badge: string | null;
    description: string;
    emoji: string | null;
    imageUrl: string | null;
    isNew: boolean;
    featuredInHome: boolean;
  },
  galleryRows: { url: string }[] = []
): StoreProduct {
  const main = p.imageUrl?.trim() || "";
  const extras = galleryRows.map((g) => g.url).filter(Boolean);
  const primary = main || extras[0] || "";
  const gallery = main ? extras : extras.slice(1);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    subcategory: p.subcategory,
    tags: Array.isArray(p.tags) ? p.tags : [],
    price: p.price,
    originalPrice: p.originalPrice,
    rating: p.rating,
    reviews: p.reviews,
    badge: (p.badge as StoreProduct["badge"]) ?? null,
    description: p.description,
    img: primary,
    emoji: p.emoji ?? "📦",
    isNew: p.isNew,
    featuredInHome: p.featuredInHome,
    gallery,
  };
}

/** Catálogo tienda pública: una query con imágenes; caché Next 5 min (no aplica a admin). */
const getCachedStorefrontProducts = unstable_cache(
  async (): Promise<StoreProduct[]> => {
    const rows = await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ featuredInHome: "desc" }, { name: "asc" }],
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (rows.length === 0) return mockProducts;
    return rows.map((r) => rowToStore(r, r.images));
  },
  ["storefront-products-v2"],
  { revalidate: 300 }
);

/** Fase D: usa Prisma si hay DB; si no, mock tipado. */
export async function getStorefrontProducts(): Promise<StoreProduct[]> {
  if (!process.env.DATABASE_URL) return mockProducts;
  try {
    return await getCachedStorefrontProducts();
  } catch {
    return mockProducts;
  }
}

/** Productos activos de una categoría (payload reducido vs catálogo completo). */
export async function getStorefrontProductsByCategory(categorySlug: string): Promise<StoreProduct[]> {
  if (!process.env.DATABASE_URL) {
    const list = mockProducts.filter((p) => p.category === categorySlug);
    return orderCategoryProductsByFeatured(list, defaultFeaturedProductIds(list));
  }
  try {
    return await unstable_cache(
      async () => {
        const cat = await prisma.category.findUnique({
          where: { slug: categorySlug },
          select: { storefrontFeaturedProductIds: true },
        });
        const featuredIds = cat?.storefrontFeaturedProductIds ?? [];

        const rows = await prisma.product.findMany({
          where: { active: true, category: categorySlug },
          orderBy: [{ featuredInHome: "desc" }, { name: "asc" }],
          include: { images: { orderBy: { sortOrder: "asc" } } },
        });
        const products = rows.map((r) => rowToStore(r, r.images));
        const ids =
          featuredIds.length > 0 ? featuredIds : defaultFeaturedProductIds(products);
        return orderCategoryProductsByFeatured(products, ids);
      },
      ["storefront-products-by-category", categorySlug],
      { revalidate: 300, tags: [categoryProductsCacheTag(categorySlug)] },
    )();
  } catch {
    const list = mockProducts.filter((p) => p.category === categorySlug);
    return orderCategoryProductsByFeatured(list, defaultFeaturedProductIds(list));
  }
}

export type CategoryFeaturedBundle = {
  products: StoreProduct[];
  featuredIds: string[];
  totalCount: number;
};

/** Solo la vitrina inicial (6 productos) para carga rápida de la landing. */
export async function getStorefrontCategoryFeaturedProducts(categorySlug: string): Promise<CategoryFeaturedBundle> {
  if (!process.env.DATABASE_URL) {
    const all = mockProducts.filter((p) => p.category === categorySlug);
    const featuredIds = defaultFeaturedProductIds(all);
    const byId = new Map(all.map((p) => [p.id, p]));
    const products = featuredIds
      .map((id) => byId.get(id))
      .filter((p): p is StoreProduct => Boolean(p));
    return { products, featuredIds, totalCount: all.length };
  }

  try {
    return await unstable_cache(
      async () => {
        const cat = await prisma.category.findUnique({
          where: { slug: categorySlug },
          select: { storefrontFeaturedProductIds: true },
        });

        const totalCount = await prisma.product.count({
          where: { active: true, category: categorySlug },
        });

        const allIds =
          cat?.storefrontFeaturedProductIds?.length
            ? cat.storefrontFeaturedProductIds.slice(0, CATEGORY_STOREFRONT_FEATURED_COUNT)
            : [];

        let featuredIds = allIds;
        if (featuredIds.length === 0) {
          const seed = await prisma.product.findMany({
            where: { active: true, category: categorySlug },
            orderBy: [{ featuredInHome: "desc" }, { name: "asc" }],
            take: CATEGORY_STOREFRONT_FEATURED_COUNT,
            select: { id: true },
          });
          featuredIds = seed.map((r) => r.id);
        }

        if (featuredIds.length === 0) {
          return { products: [], featuredIds: [], totalCount };
        }

        const rows = await prisma.product.findMany({
          where: { active: true, id: { in: featuredIds }, category: categorySlug },
          include: { images: { orderBy: { sortOrder: "asc" } } },
        });
        const byId = new Map(rows.map((r) => [r.id, rowToStore(r, r.images)]));
        const products = featuredIds
          .map((id) => byId.get(id))
          .filter((p): p is StoreProduct => Boolean(p));

        return { products, featuredIds, totalCount };
      },
      ["storefront-category-featured", categorySlug],
      { revalidate: 300, tags: [categoryProductsCacheTag(categorySlug)] },
    )();
  } catch {
    const all = mockProducts.filter((p) => p.category === categorySlug);
    const featuredIds = defaultFeaturedProductIds(all);
    const byId = new Map(all.map((p) => [p.id, p]));
    const products = featuredIds
      .map((id) => byId.get(id))
      .filter((p): p is StoreProduct => Boolean(p));
    return { products, featuredIds, totalCount: all.length };
  }
}
