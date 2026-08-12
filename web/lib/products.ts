import { unstable_cache } from "next/cache";
import { mockProducts } from "@/data/mock-products";
import {
  formatBrandDisplayName,
  brandSlugFromName,
  type StoreBrandListItem,
} from "@/lib/brand-display";
import {
  CATEGORY_STOREFRONT_FEATURED_COUNT,
  defaultFeaturedProductIds,
  orderCategoryProductsByFeatured,
} from "@/lib/category-storefront-featured";
import { categoryProductsCacheTag } from "@/lib/server/revalidate-category-storefront";
import { STOREFRONT_PRODUCTS_CACHE_TAG } from "@/lib/server/revalidate-storefront-products";
import { resolveProductPrice } from "@/lib/product-discount";
import type { StoreProduct } from "@/lib/types/product";
import { prisma } from "@/lib/prisma";

const productStoreInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  tintFamily: { select: { name: true } },
  tintType: { select: { name: true } },
};

type ProductRow = {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  tags: string[];
  price: number;
  originalPrice: number | null;
  discountPercent?: number | null;
  discountEndsAt?: Date | null;
  discountBasePrice?: number | null;
  rating: number;
  reviews: number;
  badge: string | null;
  description: string;
  emoji: string | null;
  imageUrl: string | null;
  isNew: boolean;
  featuredInHome: boolean;
  tintLevel?: string | null;
  tintGroup?: string | null;
  tintFamily?: { name: string } | null;
  tintType?: { name: string } | null;
  variantGroupCode?: string | null;
  variantGroupOrder?: number | null;
  colorHex?: string | null;
  colorName?: string | null;
};

function rowToStore(p: ProductRow, galleryRows: { url: string }[] = []): StoreProduct {
  const main = p.imageUrl?.trim() || "";
  const extras = galleryRows.map((g) => g.url).filter(Boolean);
  const primary = main || extras[0] || "";
  const gallery = main ? extras : extras.slice(1);
  const tintLevel = p.tintLevel?.trim() || undefined;
  const tintGroup = p.tintGroup?.trim() || undefined;
  const tintFamily = p.tintFamily?.name?.trim() || undefined;
  const tintType = p.tintType?.name?.trim() || undefined;
  const resolved = resolveProductPrice({
    price: p.price,
    originalPrice: p.originalPrice,
    discountPercent: p.discountPercent,
    discountEndsAt: p.discountEndsAt,
    discountBasePrice: p.discountBasePrice,
  });
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    subcategory: p.subcategory,
    tags: Array.isArray(p.tags) ? p.tags : [],
    price: resolved.price,
    originalPrice: resolved.originalPrice,
    discountPercent: resolved.discountPercent,
    rating: p.rating,
    reviews: p.reviews,
    badge: (p.badge as StoreProduct["badge"]) ?? null,
    description: p.description,
    img: primary,
    emoji: p.emoji ?? "📦",
    isNew: p.isNew,
    featuredInHome: p.featuredInHome,
    gallery,
    ...(tintLevel ? { tintLevel } : {}),
    ...(tintGroup ? { tintGroup } : {}),
    ...(tintFamily ? { tintFamily } : {}),
    ...(tintType ? { tintType } : {}),
    variantGroupCode: p.variantGroupCode?.trim() || null,
    variantGroupOrder: p.variantGroupOrder ?? null,
    ...(p.colorHex?.trim() ? { colorHex: p.colorHex.trim() } : {}),
    ...(p.colorName?.trim() ? { colorName: p.colorName.trim() } : {}),
  };
}

/** Catálogo tienda pública: una query con imágenes; caché Next 5 min (no aplica a admin). */
const getCachedStorefrontProducts = unstable_cache(
  async (): Promise<StoreProduct[]> => {
    const rows = await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ featuredInHome: "desc" }, { name: "asc" }],
      include: productStoreInclude,
    });
    if (rows.length === 0) return mockProducts;
    return rows.map((r) => rowToStore(r, r.images));
  },
  ["storefront-products-v3"],
  { revalidate: 300, tags: [STOREFRONT_PRODUCTS_CACHE_TAG] }
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

const CATEGORY_LIST_IMAGE_LIMIT = 4;

export type CategoryProductsPage = {
  products: StoreProduct[];
  totalCount: number;
  hasMore: boolean;
};

/** Página de productos de una categoría (excluye vitrina ya mostrada en SSR). */
export async function getStorefrontCategoryProductsPage(
  categorySlug: string,
  opts: { skip: number; take: number; excludeIds?: string[] },
): Promise<CategoryProductsPage> {
  const { skip, take, excludeIds = [] } = opts;

  if (!process.env.DATABASE_URL) {
    const all = orderCategoryProductsByFeatured(
      mockProducts.filter((p) => p.category === categorySlug),
      excludeIds.length > 0 ? excludeIds : defaultFeaturedProductIds(
        mockProducts.filter((p) => p.category === categorySlug),
      ),
    );
    const rest = all.filter((p) => !excludeIds.includes(p.id));
    const page = rest.slice(skip, skip + take);
    return {
      products: page,
      totalCount: all.length,
      hasMore: skip + page.length < rest.length,
    };
  }

  try {
    const exclude = excludeIds.filter(Boolean);
    const where = {
      active: true,
      category: categorySlug,
      ...(exclude.length > 0 ? { id: { notIn: exclude } } : {}),
    };

    const [totalCount, rows] = await Promise.all([
      prisma.product.count({ where: { active: true, category: categorySlug } }),
      prisma.product.findMany({
        where,
        orderBy: [{ featuredInHome: "desc" }, { name: "asc" }],
        skip,
        take,
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: CATEGORY_LIST_IMAGE_LIMIT },
        },
      }),
    ]);

    const products = rows.map((r) => rowToStore(r, r.images));
    const restTotal = await prisma.product.count({ where });
    return {
      products,
      totalCount,
      hasMore: skip + products.length < restTotal,
    };
  } catch {
    const all = mockProducts.filter((p) => p.category === categorySlug);
    const rest = all.filter((p) => !excludeIds.includes(p.id));
    const page = rest.slice(skip, skip + take);
    return { products: page, totalCount: all.length, hasMore: skip + page.length < rest.length };
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
          include: productStoreInclude,
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
          include: productStoreInclude,
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

export async function listStorefrontBrands(): Promise<StoreBrandListItem[]> {
  try {
    const grouped = await prisma.product.groupBy({
      by: ['brand'],
      where: { active: true, brand: { not: '' } },
      _count: { _all: true },
      orderBy: { brand: 'asc' },
    });
    const bySlug = new Map<string, StoreBrandListItem>();
    for (const row of grouped) {
      const name = (row.brand || '').trim();
      if (!name) continue;
      const slug = brandSlugFromName(name);
      if (!slug) continue;
      const existing = bySlug.get(slug);
      if (existing) {
        existing.productCount += row._count._all;
      } else {
        bySlug.set(slug, {
          name,
          slug,
          displayName: formatBrandDisplayName(name),
          productCount: row._count._all,
        });
      }
    }
    return Array.from(bySlug.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' }),
    );
  } catch {
    const bySlug = new Map<string, StoreBrandListItem>();
    for (const p of mockProducts) {
      const name = (p.brand || '').trim();
      if (!name) continue;
      const slug = brandSlugFromName(name);
      if (!slug) continue;
      const existing = bySlug.get(slug);
      if (existing) existing.productCount += 1;
      else {
        bySlug.set(slug, {
          name,
          slug,
          displayName: formatBrandDisplayName(name),
          productCount: 1,
        });
      }
    }
    return Array.from(bySlug.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' }),
    );
  }
}

export async function resolveBrandNameFromSlug(slug: string): Promise<string | null> {
  const brands = await listStorefrontBrands();
  const hit = brands.find((b) => b.slug === slug);
  return hit?.name ?? null;
}

async function brandNamesMatchingSlug(brandSlug: string): Promise<string[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { active: true, brand: { not: "" } },
      select: { brand: true },
      distinct: ["brand"],
    });
    return rows.map((r) => r.brand).filter((name) => brandSlugFromName(name) === brandSlug);
  } catch {
    return mockProducts
      .map((p) => p.brand)
      .filter((name, i, arr) => brandSlugFromName(name) === brandSlug && arr.indexOf(name) === i);
  }
}

export async function getStorefrontBrandProductsPage(
  brandSlug: string,
  opts?: { take?: number; cursor?: string | null },
): Promise<{ products: StoreProduct[]; nextCursor: string | null; totalCount: number }> {
  const take = Math.min(Math.max(opts?.take ?? 24, 1), 48);
  const cursor = opts?.cursor?.trim() || null;
  const brandNames = await brandNamesMatchingSlug(brandSlug);
  if (brandNames.length === 0) return { products: [], nextCursor: null, totalCount: 0 };

  try {
    return await unstable_cache(
      async () => {
        const where = { active: true, brand: { in: brandNames } };
        const totalCount = await prisma.product.count({ where });
        const rows = await prisma.product.findMany({
          where,
          include: productStoreInclude,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: take + 1,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        const hasMore = rows.length > take;
        const page = hasMore ? rows.slice(0, take) : rows;
        return {
          products: page.map((r) => rowToStore(r, r.images)),
          nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
          totalCount,
        };
      },
      ["storefront-brand-page", brandSlug, String(take), cursor ?? ""],
      { revalidate: 120, tags: ["storefront-brands", `storefront-brand:${brandSlug}`] },
    )();
  } catch {
    const all = mockProducts.filter((p) => brandSlugFromName(p.brand) === brandSlug);
    const start = cursor ? all.findIndex((p) => p.id === cursor) + 1 : 0;
    const slice = all.slice(Math.max(0, start), Math.max(0, start) + take + 1);
    const hasMore = slice.length > take;
    const page = hasMore ? slice.slice(0, take) : slice;
    return {
      products: page,
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      totalCount: all.length,
    };
  }
}
