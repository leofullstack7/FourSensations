/** URL absoluta http(s) a imagen (p. ej. CDN). */
export function isHttpImageUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  return s.startsWith("https://") || s.startsWith("http://");
}

/** Fotos locales servidas desde `assets/productos` (SKU WebP). */
export function isLocalProductMediaUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  return /^\/api\/media\/productos\/FS\d{3}\/FS\d{3}-\d+\.webp$/i.test(s.trim());
}

/** URL que la tienda/admin pueden mostrar (CDN o archivo local del SKU). */
export function isDisplayableImageUrl(s: string | null | undefined): boolean {
  return isHttpImageUrl(s) || isLocalProductMediaUrl(s);
}

export function productMediaPublicUrl(sku: string, fileName: string): string {
  return `/api/media/productos/${sku}/${fileName}`;
}
