import type { StoreProduct } from "@/lib/types/product";
import { isDisplayableImageUrl } from "@/lib/util/image-url";

export function productHasStorePhoto(p: StoreProduct): boolean {
  return isDisplayableImageUrl(p.img);
}

/** Suma puntos por atributos que resaltan en la grilla del home. */
export function productHighlightScore(p: StoreProduct): number {
  let score = 0;
  if (p.featuredInHome) score += 100;
  if (p.badge === "best" || p.badge === "hot") score += 40;
  else if (p.badge === "new" || p.badge === "sale") score += 28;
  if (p.isNew) score += 22;
  if (p.originalPrice != null && p.originalPrice > p.price) score += 18;
  if (p.rating >= 4.8 && p.reviews >= 50) score += 12;
  else if (p.rating >= 4.5 && p.reviews >= 20) score += 6;
  if (p.reviews >= 120) score += 5;
  return score;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function sortWithinGroup(products: StoreProduct[], seed: string): StoreProduct[] {
  return [...products].sort((a, b) => {
    const scoreDelta = productHighlightScore(b) - productHighlightScore(a);
    if (scoreDelta !== 0) return scoreDelta;
    return hashString(`${seed}:${a.id}`) - hashString(`${seed}:${b.id}`);
  });
}

/** Reparte productos en round-robin entre categorías para variedad en el home. */
function interleaveByCategory(products: StoreProduct[], seed: string): StoreProduct[] {
  if (products.length <= 1) return products;

  const byCategory = new Map<string, StoreProduct[]>();
  for (const product of products) {
    const bucket = byCategory.get(product.category) ?? [];
    bucket.push(product);
    byCategory.set(product.category, bucket);
  }

  for (const [category, list] of byCategory) {
    byCategory.set(category, sortWithinGroup(list, `${seed}:${category}`));
  }

  const categories = Array.from(byCategory.keys()).sort((a, b) => {
    const aFeatured = byCategory.get(a)!.some((p) => p.featuredInHome);
    const bFeatured = byCategory.get(b)!.some((p) => p.featuredInHome);
    if (aFeatured !== bFeatured) return aFeatured ? -1 : 1;
    return hashString(`${seed}:cat:${a}`) - hashString(`${seed}:cat:${b}`);
  });

  const indexByCategory = new Map(categories.map((c) => [c, 0]));
  const mixed: StoreProduct[] = [];

  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const category of categories) {
      const list = byCategory.get(category)!;
      const index = indexByCategory.get(category)!;
      if (index < list.length) {
        mixed.push(list[index]!);
        indexByCategory.set(category, index + 1);
        hasMore = true;
      }
    }
  }

  return mixed;
}

/**
 * Orden del home (vista por defecto):
 * 1) prioridad admin (`featuredInHome`)
 * 2) productos con foto
 * 3) productos sin foto
 * Dentro de cada grupo se mezcla por categoría.
 */
export function sortProductsForHomeDisplay(
  products: StoreProduct[],
  seed = new Date().toISOString().slice(0, 10)
): StoreProduct[] {
  if (products.length <= 1) return products;

  const featuredWithPhoto: StoreProduct[] = [];
  const featuredWithoutPhoto: StoreProduct[] = [];
  const regularWithPhoto: StoreProduct[] = [];
  const regularWithoutPhoto: StoreProduct[] = [];

  for (const product of products) {
    const hasPhoto = productHasStorePhoto(product);
    if (product.featuredInHome) {
      (hasPhoto ? featuredWithPhoto : featuredWithoutPhoto).push(product);
    } else {
      (hasPhoto ? regularWithPhoto : regularWithoutPhoto).push(product);
    }
  }

  return [
    ...interleaveByCategory(featuredWithPhoto, `${seed}:featured-photo`),
    ...interleaveByCategory(featuredWithoutPhoto, `${seed}:featured-plain`),
    ...interleaveByCategory(regularWithPhoto, `${seed}:regular-photo`),
    ...interleaveByCategory(regularWithoutPhoto, `${seed}:regular-plain`),
  ];
}
