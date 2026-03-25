import type { Product, ProductImage } from "@prisma/client";
import type { AdminProduct, AdminProductImage } from "@/lib/types/admin";

export type ProductWithImages = Product & { images?: ProductImage[] };

function mapImages(rows: ProductImage[] | undefined): AdminProductImage[] {
  if (!rows?.length) return [];
  return [...rows]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())
    .map((i) => ({ id: i.id, url: i.url, sortOrder: i.sortOrder }));
}

export function prismaProductToAdmin(p: ProductWithImages): AdminProduct {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    subcategory: p.subcategory,
    price: p.price,
    originalPrice: p.originalPrice,
    stock: p.stock,
    rating: p.rating,
    reviews: p.reviews,
    badge: p.badge,
    description: p.description,
    emoji: p.emoji ?? "📦",
    active: p.active,
    isNew: p.isNew,
    featuredInHome: p.featuredInHome,
    slug: p.slug,
    externalRef: p.externalRef ?? null,
    imageUrl: p.imageUrl,
    images: mapImages(p.images),
  };
}
