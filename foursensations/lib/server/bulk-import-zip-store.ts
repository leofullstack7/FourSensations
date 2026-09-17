import { mkdir, writeFile, readFile, unlink, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getBunnyStorageConfig } from "@/lib/server/bunny-config";

/**
 * Almacén del ZIP de carga masiva.
 * 1) Disco temporal (rápido en la misma instancia)
 * 2) Bunny Storage (sobrevive reinicios de Render / cambio de instancia)
 * Evita meter blobs de ~20–50 MB en Neon.
 */
const BULK_ZIP_MAX_BYTES = 55 * 1024 * 1024;

function bulkZipDir(): string {
  return path.join(os.tmpdir(), "ginna-bulk-import");
}

export function bulkZipFilePath(jobId: string): string {
  return path.join(bulkZipDir(), `${jobId}.zip`);
}

export function bulkZipBunnyPath(jobId: string): string {
  return `bulk-import/${jobId}.zip`;
}

function storagePutUrl(hostname: string, zone: string, objectPath: string): string {
  const encoded = objectPath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://${hostname}/${zone}/${encoded}`;
}

export async function saveBulkImportZip(jobId: string, zipBuffer: Buffer): Promise<void> {
  await mkdir(bulkZipDir(), { recursive: true });
  await writeFile(bulkZipFilePath(jobId), zipBuffer);

  // Backup durable: si Render reinicia, /tmp se borra y el match/commit fallaba.
  const cfg = getBunnyStorageConfig();
  if (!cfg) {
    console.warn("[bulk-zip] Bunny no configurado: el ZIP solo vive en /tmp (se pierde al reiniciar).");
    return;
  }
  if (zipBuffer.length > BULK_ZIP_MAX_BYTES) {
    console.warn("[bulk-zip] ZIP demasiado grande para backup Bunny; solo /tmp.");
    return;
  }

  const objectPath = bulkZipBunnyPath(jobId);
  const putUrl = storagePutUrl(cfg.storageApiHostname, cfg.storageZoneName, objectPath);
  const res = await fetch(putUrl, {
    method: "PUT",
    headers: {
      AccessKey: cfg.apiKey,
      "Content-Type": "application/zip",
      "Content-Length": String(zipBuffer.length),
    },
    body: new Uint8Array(zipBuffer),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[bulk-zip] Falló backup Bunny ${res.status}: ${text || res.statusText}`);
    // No tumbar el analyze: /tmp sigue disponible en esta instancia.
    return;
  }
}

export async function loadBulkImportZip(jobId: string): Promise<Buffer | null> {
  try {
    const buf = await readFile(bulkZipFilePath(jobId));
    if (buf.length > 0) return buf;
  } catch {
    /* miss en disco */
  }

  const cfg = getBunnyStorageConfig();
  if (!cfg) return null;

  const objectPath = bulkZipBunnyPath(jobId);
  const getUrl = storagePutUrl(cfg.storageApiHostname, cfg.storageZoneName, objectPath);
  try {
    const res = await fetch(getUrl, {
      method: "GET",
      headers: { AccessKey: cfg.apiKey },
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);
    if (buf.length === 0) return null;
    // Recachear en /tmp para siguientes pasos de la misma instancia.
    try {
      await mkdir(bulkZipDir(), { recursive: true });
      await writeFile(bulkZipFilePath(jobId), buf);
    } catch {
      /* ignore cache write */
    }
    return buf;
  } catch (e) {
    console.error("[bulk-zip] Error al descargar ZIP de Bunny:", e);
    return null;
  }
}

export async function deleteBulkImportZip(jobId: string): Promise<void> {
  try {
    await unlink(bulkZipFilePath(jobId));
  } catch {
    /* ya no existe */
  }

  const cfg = getBunnyStorageConfig();
  if (!cfg) return;
  const objectPath = bulkZipBunnyPath(jobId);
  const delUrl = storagePutUrl(cfg.storageApiHostname, cfg.storageZoneName, objectPath);
  try {
    await fetch(delUrl, {
      method: "DELETE",
      headers: { AccessKey: cfg.apiKey },
    });
  } catch {
    /* ignore */
  }
}

/** Resuelve el ZIP del job: disco → Bunny → columna legacy zipBlob. */
export async function resolveBulkImportZipBuffer(
  jobId: string,
  zipBlob: Uint8Array | Buffer | null | undefined,
): Promise<Buffer> {
  const fromStore = await loadBulkImportZip(jobId);
  if (fromStore && fromStore.length > 0) return fromStore;

  if (zipBlob && zipBlob.length > 0) {
    return Buffer.isBuffer(zipBlob) ? zipBlob : Buffer.from(zipBlob);
  }

  throw new Error(
    "El ZIP de esta sesión ya no está disponible (reinicio del servidor o expiración). Vuelve a analizar CSV + ZIP.",
  );
}

export async function tryResolveBulkImportZipBuffer(
  jobId: string,
  zipBlob: Uint8Array | Buffer | null | undefined,
): Promise<Buffer | null> {
  try {
    return await resolveBulkImportZipBuffer(jobId, zipBlob);
  } catch {
    return null;
  }
}

export async function cleanupBulkImportZipDir(): Promise<void> {
  try {
    await rm(bulkZipDir(), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
