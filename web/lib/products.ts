import { mockProducts } from "@/data/mock-products";
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

/** Fase D: usa Prisma si hay DB; si no, mock tipado. */
export async function getStorefrontProducts(): Promise<StoreProduct[]> {
  if (!process.env.DATABASE_URL) return mockProducts;
  try {
    const rows = await prisma.product.findMany({
      where: { active: true },
      orderBy: [{ featuredInHome: "desc" }, { createdAt: "desc" }],
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (rows.length === 0) return mockProducts;
    return rows.map((r) => rowToStore(r, r.images));
  } catch {
    return mockProducts;
  }
}
