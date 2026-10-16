import { getStorefrontCategoryProductsPage } from "@/lib/products";
import { listSkuMediaUrls } from "@/lib/server/product-photo-files";
import { isDisplayableImageUrl } from "@/lib/util/image-url";

/** Bancos de fotos locales cuando el catálogo de esa categoría todavía no tiene 3 imágenes. */
const CATEGORY_PHOTO_SKUS: Record<string, string[]> = {
  accesorios: ["FS027", "FS020"],
  "cuidado-corporal": ["FS029", "FS021"],
};

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

/** Hasta `count` fotos distintas para el collage del hero. */
export async function pickRandomCollageImages(slugs: string[], count = 3): Promise<string[]> {
  const pool: string[] = [];

  for (const slug of slugs) {
    const page = await getStorefrontCategoryProductsPage(slug, { skip: 0, take: 80 });
    for (const product of page.products) {
      pool.push(product.img, ...(product.gallery ?? []));
    }
    for (const sku of CATEGORY_PHOTO_SKUS[slug] ?? []) {
      pool.push(...listSkuMediaUrls(sku));
    }
  }

  const picked: string[] = [];
  const seen = new Set<string>();
  for (const raw of shuffle(pool)) {
    const url = raw?.trim() || "";
    if (!url || seen.has(url) || !isDisplayableImageUrl(url)) continue;
    seen.add(url);
    picked.push(url);
    if (picked.length >= count) break;
  }
  return picked;
}
