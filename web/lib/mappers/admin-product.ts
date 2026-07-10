import type { Product, ProductImage } from "@prisma/client";
import { parseAiGeneratedFields } from "@/lib/product-ai-fields";
import type { AdminProduct, AdminProductImage, AiGeneratedFieldsMap } from "@/lib/types/admin";

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
    tags: Array.isArray(p.tags) ? p.tags : [],
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
    variantGroupCode: p.variantGroupCode ?? null,
    variantGroupOrder: p.variantGroupOrder ?? null,
    colorHex: p.colorHex ?? null,
    colorName: p.colorName ?? null,
    imageUrl: p.imageUrl,
    images: mapImages(p.images),
    aiGeneratedFields: parseAiGeneratedFields(p.aiGeneratedFields) as AiGeneratedFieldsMap,
  };
}
