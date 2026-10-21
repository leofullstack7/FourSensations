/** URL absoluta http(s) a imagen (p. ej. CDN). */
export function isHttpImageUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  return s.startsWith("https://") || s.startsWith("http://");
}

function isBunnyCdnUrl(src: string): boolean {
  const base = (process.env.NEXT_PUBLIC_BUNNY_CDN_BASE_URL || process.env.BUNNY_CDN_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (base && src.startsWith(base)) return true;
  return /\.b-cdn\.net\//i.test(src) || /\.bunnycdn\.com\//i.test(src);
}

/**
 * WebP de producto / CDN ya van listos: el optimizador Sharp en Render free
 * duplicaba descarga+CPU y retrasaba cada card varios segundos.
 */
export function shouldBypassNextImageOptimizer(src: string | null | undefined): boolean {
  if (!src) return true;
  if (src.startsWith("data:") || src.startsWith("blob:")) return true;
  if (isLocalProductMediaUrl(src) || isStoredMediaUrl(src)) return true;
  if (isHttpImageUrl(src) && isBunnyCdnUrl(src)) return true;
  return false;
}

/** Fotos de SKU: estáticas en `/media/productos` (o legacy `/api/media/productos`). */
export function isLocalProductMediaUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  const u = s.trim();
  return (
    /^\/media\/productos\/FS\d{3}\/FS\d{3}-\d+\.webp$/i.test(u) ||
    /^\/api\/media\/productos\/FS\d{3}\/FS\d{3}-\d+\.webp$/i.test(u)
  );
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

/** Prefiere estático `/media/...` (CDN edge / sin Node). */
export function productMediaPublicUrl(sku: string, fileName: string): string {
  return `/media/productos/${sku}/${fileName}`;
}

/** Reescribe URLs legacy `/api/media/productos` → estático `/media/productos`. */
export function toFastProductMediaUrl(url: string): string {
  const u = url.trim();
  const m = u.match(/^\/api\/media\/productos\/(FS\d{3})\/(FS\d{3}-\d+\.webp)$/i);
  if (m) return `/media/productos/${m[1]!.toUpperCase()}/${m[2]}`;
  return u;
}
