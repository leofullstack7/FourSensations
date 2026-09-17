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

/**
 * Sube bytes a Bunny Storage. Devuelve la URL pública del Pull Zone.
 */
export async function uploadImageToBunny(
  buffer: Buffer,
  contentType: string
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

  const path = `products/${randomUUID()}.${ext}`;
  const putUrl = storagePutUrl(cfg, path);

  const res = await fetch(putUrl, {
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
    throw new Error(`Bunny Storage ${res.status}: ${text || res.statusText}`);
  }

  const publicUrl = `${cfg.cdnBaseUrl}/${path}`;
  return { path, publicUrl };
}
