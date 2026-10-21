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

/** Foto de banco (BYTEA exportada a estático o vía API). */
export function isStoredMediaUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  const u = s.trim();
  return (
    /^\/media\/stored\/[a-z0-9]+\.(webp|jpe?g|png|gif)$/i.test(u) ||
    /^\/api\/media\/stored\/[a-z0-9]+$/i.test(u)
  );
}

/** URL que la tienda/admin pueden mostrar (CDN, archivo local del SKU o foto guardada). */
export function isDisplayableImageUrl(s: string | null | undefined): boolean {
  return isHttpImageUrl(s) || isLocalProductMediaUrl(s) || isStoredMediaUrl(s);
}

/** Prefiere estático `/media/...` (CDN edge / sin Node). */
export function productMediaPublicUrl(sku: string, fileName: string): string {
  return `/media/productos/${sku}/${fileName}`;
}

/** Reescribe solo SKU a estático (siempre en disco). Stored: estático + API fallback. */
export function toFastProductMediaUrl(url: string): string {
  const u = url.trim();
  const prod = u.match(/^\/api\/media\/productos\/(FS\d{3})\/(FS\d{3}-\d+\.webp)$/i);
  if (prod) return `/media/productos/${prod[1]!.toUpperCase()}/${prod[2]}`;
  const stored = u.match(/^\/api\/media\/stored\/([a-z0-9]+)$/i);
  if (stored) return `/media/stored/${stored[1]}.webp`;
  return u;
}

function storedApiFromStatic(url: string): string | null {
  const m = url.trim().match(/^\/media\/stored\/([a-z0-9]+)\.(webp|jpe?g|png|gif)$/i);
  return m ? `/api/media/stored/${m[1]}` : null;
}

/** Prioriza SKU estático; stored estático; API stored como respaldo. */
export function preferFastStorefrontUrls(urls: string[]): string[] {
  const score = (u: string) => {
    if (/^\/media\/productos\//i.test(u)) return 0;
    if (/^\/media\/stored\//i.test(u)) return 1;
    if (/^\/api\/media\/productos\//i.test(u)) return 2;
    if (/^\/api\/media\/stored\//i.test(u)) return 3;
    if (isHttpImageUrl(u)) return 1;
    return 4;
  };
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (u: string) => {
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  for (const raw of [...urls].sort((a, b) => score(a) - score(b))) {
    const u = toFastProductMediaUrl(raw);
    push(u);
    // Si el estático de build no existe (404), el card debe caer al API al instante.
    const api = storedApiFromStatic(u);
    if (api) push(api);
    if (/^\/api\/media\/stored\/[a-z0-9]+$/i.test(raw.trim())) push(raw.trim());
  }
  return out;
}
