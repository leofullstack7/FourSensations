import AdmZip from "adm-zip";
import path from "node:path";
import sharp from "sharp";
import { IMAGE_EXT } from "./constants";

export const BULK_ZIP_OPTIMIZE_MAX_WIDTH = 1200;
export const BULK_ZIP_OPTIMIZE_MAX_HEIGHT = 1200;
export const BULK_ZIP_WEBP_QUALITY = 82;

export type ZipOptimizeStats = {
  imageCount: number;
  skippedAlreadyOptimized: number;
  beforeBytes: number;
  afterBytes: number;
  savedBytes: number;
  savedPercent: number;
};

function isIgnoredPath(entryName: string): boolean {
  const lower = entryName.toLowerCase();
  return lower.includes("__macosx") || lower.endsWith(".ds_store");
}

/** Convierte imágenes del ZIP a WebP más livianas; conserva rutas (cambia extensión a .webp). */
export async function optimizeBulkZipImages(zipBuffer: Buffer): Promise<{
  zipBuffer: Buffer;
  stats: ZipOptimizeStats;
}> {
  const zip = new AdmZip(zipBuffer);
  const outZip = new AdmZip();
  let beforeBytes = 0;
  let afterBytes = 0;
  let imageCount = 0;
  let skippedAlreadyOptimized = 0;

  for (const e of zip.getEntries()) {
    const entryName = e.entryName.replace(/\\/g, "/");
    if (e.isDirectory) {
      outZip.addFile(`${entryName}/`, Buffer.alloc(0));
      continue;
    }
    if (isIgnoredPath(entryName)) continue;

    const ext = path.extname(entryName).toLowerCase();
    if (!IMAGE_EXT.has(ext)) {
      outZip.addFile(entryName, e.getData());
      continue;
    }

    const input = e.getData();
    beforeBytes += input.length;
    imageCount += 1;

    const basePath = entryName.slice(0, -ext.length);
    const outName = `${basePath}.webp`;

    if (ext === ".webp" && input.length <= 180_000) {
      outZip.addFile(entryName, input);
      afterBytes += input.length;
      skippedAlreadyOptimized += 1;
      continue;
    }

    try {
      const optimized = await sharp(input)
        .rotate()
        .resize(BULK_ZIP_OPTIMIZE_MAX_WIDTH, BULK_ZIP_OPTIMIZE_MAX_HEIGHT, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: BULK_ZIP_WEBP_QUALITY, effort: 4 })
        .toBuffer();
      outZip.addFile(outName, optimized);
      afterBytes += optimized.length;
    } catch {
      outZip.addFile(entryName, input);
      afterBytes += input.length;
      skippedAlreadyOptimized += 1;
    }
  }

  const savedBytes = Math.max(0, beforeBytes - afterBytes);
  const savedPercent = beforeBytes > 0 ? Math.round((savedBytes / beforeBytes) * 100) : 0;

  return {
    zipBuffer: outZip.toBuffer(),
    stats: {
      imageCount,
      skippedAlreadyOptimized,
      beforeBytes,
      afterBytes,
      savedBytes,
      savedPercent,
    },
  };
}
