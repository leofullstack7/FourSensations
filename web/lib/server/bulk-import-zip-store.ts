import { mkdir, writeFile, readFile, unlink, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Almacén temporal del ZIP de carga masiva.
 * Evita guardar blobs de ~20–50 MB en Postgres (Neon), que provoca timeouts/502 en Render.
 */
function bulkZipDir(): string {
  return path.join(os.tmpdir(), "ginna-bulk-import");
}

export function bulkZipFilePath(jobId: string): string {
  return path.join(bulkZipDir(), `${jobId}.zip`);
}

export async function saveBulkImportZip(jobId: string, zipBuffer: Buffer): Promise<void> {
  await mkdir(bulkZipDir(), { recursive: true });
  await writeFile(bulkZipFilePath(jobId), zipBuffer);
}

export async function loadBulkImportZip(jobId: string): Promise<Buffer | null> {
  try {
    return await readFile(bulkZipFilePath(jobId));
  } catch {
    return null;
  }
}

export async function deleteBulkImportZip(jobId: string): Promise<void> {
  try {
    await unlink(bulkZipFilePath(jobId));
  } catch {
    /* ya no existe */
  }
}

/** Resuelve el ZIP del job: disco temporal primero, luego columna legacy zipBlob. */
export async function resolveBulkImportZipBuffer(
  jobId: string,
  zipBlob: Uint8Array | Buffer | null | undefined,
): Promise<Buffer> {
  const fromDisk = await loadBulkImportZip(jobId);
  if (fromDisk && fromDisk.length > 0) return fromDisk;

  if (zipBlob && zipBlob.length > 0) {
    return Buffer.isBuffer(zipBlob) ? zipBlob : Buffer.from(zipBlob);
  }

  throw new Error(
    "El ZIP de esta sesión ya no está disponible en el servidor (reinicio o expiración). Vuelve a analizar CSV + ZIP.",
  );
}

export async function cleanupBulkImportZipDir(): Promise<void> {
  try {
    await rm(bulkZipDir(), { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
