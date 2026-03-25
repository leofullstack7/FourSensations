/**
 * Bunny Storage + Pull Zone (CDN). Ver `docs/BUNNY_IMAGES.md`.
 */
export type BunnyStorageConfig = {
  apiKey: string;
  storageZoneName: string;
  /** Código de región (ny, br, la, …). */
  region: string;
  /** Hostname del API HTTP (sin https), ej. ny.storage.bunnycdn.com */
  storageApiHostname: string;
  /** Base pública del Pull Zone, sin barra final (ej. https://mi-cdn.b-cdn.net). */
  cdnBaseUrl: string;
};

/**
 * Hostnames oficiales Edge Storage (FTP & HTTP API en el panel Bunny).
 * Frankfurt usa `storage.bunnycdn.com` (sin prefijo de región).
 */
const REGION_TO_STORAGE_HOST: Record<string, string> = {
  de: "storage.bunnycdn.com",
  frankfurt: "storage.bunnycdn.com",
  uk: "uk.storage.bunnycdn.com",
  ny: "ny.storage.bunnycdn.com",
  la: "la.storage.bunnycdn.com",
  sg: "sg.storage.bunnycdn.com",
  se: "se.storage.bunnycdn.com",
  br: "br.storage.bunnycdn.com",
  jh: "jh.storage.bunnycdn.com",
  syd: "syd.storage.bunnycdn.com",
};

/** Opcional: copiar el hostname exacto del panel (sobreescribe región). */
function resolveStorageApiHostname(region: string, override?: string): string {
  const raw = override?.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "") || "";
  if (raw) return raw;
  const r = region.toLowerCase();
  return REGION_TO_STORAGE_HOST[r] ?? `${r}.storage.bunnycdn.com`;
}

export function getBunnyStorageConfig(): BunnyStorageConfig | null {
  const apiKey = process.env.BUNNY_STORAGE_API_KEY?.trim();
  const storageZoneName =
    process.env.BUNNY_STORAGE_ZONE_NAME?.trim() || process.env.BUNNY_STORAGE_ZONE?.trim();
  const region = (process.env.BUNNY_STORAGE_REGION?.trim() || "de").toLowerCase();
  const cdnBaseUrl = process.env.BUNNY_CDN_BASE_URL?.trim().replace(/\/$/, "") || "";
  const hostOverride = process.env.BUNNY_STORAGE_API_HOST?.trim();

  if (!apiKey || !storageZoneName || !cdnBaseUrl) return null;
  const storageApiHostname = resolveStorageApiHostname(region, hostOverride);
  return { apiKey, storageZoneName, region, storageApiHostname, cdnBaseUrl };
}

/** URLs que el admin puede guardar en DB (evita hotlink arbitrario). */
export function isTrustedCdnImageUrl(url: string): boolean {
  const base = getBunnyStorageConfig()?.cdnBaseUrl;
  if (!base) return false;
  try {
    const u = new URL(url);
    const b = new URL(base);
    return u.origin === b.origin && u.pathname.length > 1;
  } catch {
    return false;
  }
}
