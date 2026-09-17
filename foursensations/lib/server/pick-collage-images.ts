import { getStorefrontCategoryProductsPage } from "@/lib/products";
import { isDisplayableImageUrl } from "@/lib/util/image-url";

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
  }
  return next;
}

function primaryImage(img: string, gallery: string[]): string | null {
  const candidates = [img, ...gallery];
  return candidates.find((u) => isDisplayableImageUrl(u)) ?? null;
}

/** Hasta `count` fotos de productos distintos, al azar, recorriendo categorías en orden de respaldo. */
export async function pickRandomCollageImages(slugs: string[], count = 3): Promise<string[]> {
  const picked: string[] = [];
  const seen = new Set<string>();

  for (const slug of slugs) {
    const page = await getStorefrontCategoryProductsPage(slug, { skip: 0, take: 48 });
    for (const product of shuffle(page.products)) {
      if (seen.has(product.id)) continue;
      const url = primaryImage(product.img, product.gallery ?? []);
      if (!url) continue;
      seen.add(product.id);
      picked.push(url);
      if (picked.length >= count) return picked;
    }
  }

  return picked;
}
