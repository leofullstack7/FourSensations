import { isHttpImageUrl } from "@/lib/util/image-url";
import type { StoreProduct } from "@/lib/types/product";

const preloaded = new Set<string>();

/** Precarga una URL de imagen del catálogo (idempotente). */
export function preloadStorefrontImage(url: string | null | undefined): void {
  if (typeof window === "undefined" || !isHttpImageUrl(url)) return;
  const src = url as string;
  if (preloaded.has(src)) return;
  preloaded.add(src);

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = src;
  document.head.appendChild(link);

  const img = new window.Image();
  img.decoding = "async";
  img.src = src;
}

/** Precarga la imagen principal y la galería de un producto. */
export function preloadStorefrontProductImages(product: StoreProduct | null | undefined): void {
  if (!product) return;
  preloadStorefrontImage(product.img);
  for (const url of product.gallery ?? []) {
    preloadStorefrontImage(url);
  }
}
