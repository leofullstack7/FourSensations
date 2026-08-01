import AdmZip from "adm-zip";
import path from "node:path";
import sharp from "sharp";
import { IMAGE_EXT } from "./constants";

export const BULK_ZIP_OPTIMIZE_MAX_WIDTH = 1200;
export const BULK_ZIP_OPTIMIZE_MAX_HEIGHT = 1200;
export const BULK_ZIP_WEBP_QUALITY = 82;
/** Procesar de a pocas imágenes para reducir picos de memoria en serverless. */
const SHARP_CONCURRENCY = 2;

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

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, () => worker());
  await Promise.all(workers);
  return results;
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

  type WorkItem =
    | { kind: "passthrough"; entryName: string; data: Buffer }
    | { kind: "image"; entryName: string; outName: string; data: Buffer; skipReencode: boolean };

  const work: WorkItem[] = [];

  for (const e of zip.getEntries()) {
    const entryName = e.entryName.replace(/\\/g, "/");
    if (e.isDirectory) {
      outZip.addFile(`${entryName.replace(/\/?$/, "/")}`, Buffer.alloc(0));
      continue;
    }
    if (isIgnoredPath(entryName)) continue;

    const ext = path.extname(entryName).toLowerCase();
    if (!IMAGE_EXT.has(ext)) {
      work.push({ kind: "passthrough", entryName, data: e.getData() });
      continue;
    }

    const input = e.getData();
    const basePath = entryName.slice(0, -ext.length);
    const outName = `${basePath}.webp`;
    const skipReencode = ext === ".webp" && input.length <= 180_000;
    work.push({ kind: "image", entryName, outName, data: input, skipReencode });
  }

  const processed = await mapPool(work, SHARP_CONCURRENCY, async (item) => {
    if (item.kind === "passthrough") {
      return { entryName: item.entryName, data: item.data, before: 0, after: 0, image: false, skipped: false };
    }

    const before = item.data.length;
    if (item.skipReencode) {
      return {
        entryName: item.entryName,
        data: item.data,
        before,
        after: item.data.length,
        image: true,
        skipped: true,
      };
    }

    try {
      const optimized = await sharp(item.data)
        .rotate()
        .resize(BULK_ZIP_OPTIMIZE_MAX_WIDTH, BULK_ZIP_OPTIMIZE_MAX_HEIGHT, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: BULK_ZIP_WEBP_QUALITY, effort: 4 })
        .toBuffer();
      return {
        entryName: item.outName,
        data: optimized,
        before,
        after: optimized.length,
        image: true,
        skipped: false,
      };
    } catch {
      return {
        entryName: item.entryName,
        data: item.data,
        before,
        after: item.data.length,
        image: true,
        skipped: true,
      };
    }
  });

  for (const row of processed) {
    outZip.addFile(row.entryName, row.data);
    if (row.image) {
      imageCount += 1;
      beforeBytes += row.before;
      afterBytes += row.after;
      if (row.skipped) skippedAlreadyOptimized += 1;
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
