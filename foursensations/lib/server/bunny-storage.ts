import { randomUUID } from "node:crypto";
import { getBunnyStorageConfig } from "@/lib/server/bunny-config";

const MAX_BYTES = 8 * 1024 * 1024;

const MIME_TO_EXT = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export type BunnyUploadResult = { path: string; publicUrl: string };

function storagePutUrl(cfg: NonNullable<ReturnType<typeof getBunnyStorageConfig>>, objectPath: string): string {
  const encoded = objectPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://${cfg.storageApiHostname}/${cfg.storageZoneName}/${encoded}`;
}

export function bunnyExtForContentType(contentType: string): string {
  return MIME_TO_EXT.get(contentType.toLowerCase()) || "webp";
}

/** URL pública CDN si el objeto ya existe en el Pull Zone. */
export async function bunnyCdnUrlIfPresent(objectPath: string): Promise<string | null> {
  const cfg = getBunnyStorageConfig();
  if (!cfg) return null;
  const publicUrl = `${cfg.cdnBaseUrl}/${objectPath.replace(/^\/+/, "")}`;
  try {
    const head = await fetch(publicUrl, { method: "HEAD", cache: "no-store", redirect: "follow" });
    if (head.ok) return publicUrl;
  } catch {
    /* CDN frío o red */
  }
  return null;
}

/** Sube (o sobrescribe) un objeto en una ruta fija del Storage Zone. */
export async function putImageToBunnyPath(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const cfg = getBunnyStorageConfig();
  if (!cfg) {
    throw new Error("Bunny Storage no está configurado (variables de entorno)");
  }
  const path = objectPath.replace(/^\/+/, "");
  if (!path || path.includes("..")) {
    throw new Error("Ruta Bunny inválida");
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Imagen demasiado grande (máx. ${MAX_BYTES / (1024 * 1024)} MB)`);
  }
  const res = await fetch(storagePutUrl(cfg, path), {
    method: "PUT",
    headers: {
      AccessKey: cfg.apiKey,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(buffer.length),
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("BUNNY_UNAUTHORIZED");
    throw new Error(`Bunny Storage ${res.status}: ${text || res.statusText}`);
  }
  return `${cfg.cdnBaseUrl}/${path}`;
}

/**
 * Si el archivo ya está en CDN lo reutiliza; si no, lo sube y devuelve la URL pública.
 * Usado por /api/media/* para dejar de servir megabytes desde Render.
 */
export async function ensureBunnyPublicUrl(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!getBunnyStorageConfig()) return null;
  const existing = await bunnyCdnUrlIfPresent(objectPath);
  if (existing) return existing;
  try {
    return await putImageToBunnyPath(objectPath, buffer, contentType);
  } catch (e) {
    console.error("[bunny] ensureBunnyPublicUrl", objectPath, e);
    return null;
  }
}

/**
 * Sube bytes a Bunny Storage. Devuelve la URL pública del Pull Zone.
 * @param folder Prefijo de carpeta en el Storage Zone (default `uploads`).
 */
export async function uploadImageToBunny(
  buffer: Buffer,
  contentType: string,
  folder = "uploads",
): Promise<BunnyUploadResult> {
  const cfg = getBunnyStorageConfig();
  if (!cfg) {
    throw new Error("Bunny Storage no está configurado (variables de entorno)");
  }

  const ext = MIME_TO_EXT.get(contentType.toLowerCase());
  if (!ext) {
    throw new Error(`Tipo de imagen no permitido: ${contentType}`);
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error(`Imagen demasiado grande (máx. ${MAX_BYTES / (1024 * 1024)} MB)`);
  }

  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "") || "uploads";
  const path = `${safeFolder}/${randomUUID()}.${ext}`;
  const res = await fetch(storagePutUrl(cfg, path), {
    method: "PUT",
    headers: {
      AccessKey: cfg.apiKey,
      "Content-Type": "application/octet-stream",
      "Content-Length": String(buffer.length),
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("BUNNY_UNAUTHORIZED");
    }
    throw new Error(`Bunny Storage ${res.status}: ${text || res.statusText}`);
  }

  const publicUrl = `${cfg.cdnBaseUrl}/${path}`;
  return { path, publicUrl };
}
