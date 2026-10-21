/** URL absoluta http(s) a imagen (p. ej. CDN). */
export function isHttpImageUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  return s.startsWith("https://") || s.startsWith("http://");
}

/**
 * Solo evita el optimizador de next/image en data/blob.
 * /api/media y rutas públicas SÍ deben pasar por el optimizador (tamaños móviles).
 */
export function shouldBypassNextImageOptimizer(src: string | null | undefined): boolean {
  if (!src) return true;
  return src.startsWith("data:") || src.startsWith("blob:");
}

/** Fotos locales servidas desde `assets/productos` (SKU WebP). */
export function isLocalProductMediaUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  return /^\/api\/media\/productos\/FS\d{3}\/FS\d{3}-\d+\.webp$/i.test(s.trim());
}

/** Foto guardada en la base cuando Bunny no acepta la subida. */
export function isStoredMediaUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  return /^\/api\/media\/stored\/[a-z0-9]+$/i.test(s.trim());
}

/** URL que la tienda/admin pueden mostrar (CDN, archivo local del SKU o foto guardada). */
export function isDisplayableImageUrl(s: string | null | undefined): boolean {
  return isHttpImageUrl(s) || isLocalProductMediaUrl(s) || isStoredMediaUrl(s);
}

export function productMediaPublicUrl(sku: string, fileName: string): string {
  return `/api/media/productos/${sku}/${fileName}`;
}
