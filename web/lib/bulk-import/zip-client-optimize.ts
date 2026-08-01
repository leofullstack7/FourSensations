import type { ZipOptimizeStats } from "@/lib/bulk-import/zip-optimize";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

export const CLIENT_ZIP_OPTIMIZE_MAX_WIDTH = 1200;
export const CLIENT_ZIP_OPTIMIZE_MAX_HEIGHT = 1200;
export const CLIENT_ZIP_WEBP_QUALITY = 0.82;
/** WebP ya livianos se reutilizan sin re-encode. */
export const CLIENT_ZIP_SKIP_WEBP_BYTES = 180_000;

function extname(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function isIgnoredPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.includes("__macosx") || lower.endsWith(".ds_store");
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

async function blobToWebp(
  input: Blob,
  maxW: number,
  maxH: number,
  quality: number,
): Promise<Blob | null> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(input);
    const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/webp", quality);
    });
    return blob;
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

export type ClientZipOptimizeResult = {
  file: File;
  stats: ZipOptimizeStats;
};

/**
 * Optimiza imágenes del ZIP en el navegador (JSZip + Canvas → WebP).
 * Evita 502 por timeout/OOM del endpoint serverless `/zip-optimize`.
 */
export async function optimizeZipFileClient(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<ClientZipOptimizeResult> {
  const { default: JSZip } = await import("jszip");
  const src = await JSZip.loadAsync(await file.arrayBuffer());
  const out = new JSZip();

  let beforeBytes = 0;
  let afterBytes = 0;
  let imageCount = 0;
  let skippedAlreadyOptimized = 0;

  const entries = Object.entries(src.files).filter(([, entry]) => !entry.dir);
  const imageEntries = entries.filter(([path, entry]) => {
    if (entry.dir) return false;
    const normalized = path.replace(/\\/g, "/");
    if (isIgnoredPath(normalized)) return false;
    return IMAGE_EXT.has(extname(normalized));
  });
  const totalImages = imageEntries.length;
  let processed = 0;

  for (const [path, entry] of entries) {
    const normalized = path.replace(/\\/g, "/");
    if (isIgnoredPath(normalized)) continue;

    const ext = extname(normalized);
    if (!IMAGE_EXT.has(ext)) {
      const data = await entry.async("uint8array");
      out.file(normalized, data);
      continue;
    }

    const data = await entry.async("uint8array");
    beforeBytes += data.byteLength;
    imageCount += 1;
    processed += 1;
    onProgress?.(processed, totalImages);

    const basePath = normalized.slice(0, -ext.length);
    const outName = `${basePath}.webp`;

    if (ext === ".webp" && data.byteLength <= CLIENT_ZIP_SKIP_WEBP_BYTES) {
      out.file(normalized, data);
      afterBytes += data.byteLength;
      skippedAlreadyOptimized += 1;
      if (processed % 4 === 0) await yieldToUi();
      continue;
    }

    const inputBlob = new Blob([data], {
      type: ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg",
    });
    const optimized = await blobToWebp(
      inputBlob,
      CLIENT_ZIP_OPTIMIZE_MAX_WIDTH,
      CLIENT_ZIP_OPTIMIZE_MAX_HEIGHT,
      CLIENT_ZIP_WEBP_QUALITY,
    );

    if (optimized && optimized.size > 0) {
      const buf = new Uint8Array(await optimized.arrayBuffer());
      out.file(outName, buf);
      afterBytes += buf.byteLength;
    } else {
      out.file(normalized, data);
      afterBytes += data.byteLength;
      skippedAlreadyOptimized += 1;
    }

    if (processed % 3 === 0) await yieldToUi();
  }

  const zipBlob = await out.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const savedBytes = Math.max(0, beforeBytes - afterBytes);
  const savedPercent = beforeBytes > 0 ? Math.round((savedBytes / beforeBytes) * 100) : 0;
  const baseName = file.name.replace(/\.zip$/i, "");
  const outFile = new File([zipBlob], `${baseName}-optimizado.zip`, { type: "application/zip" });

  return {
    file: outFile,
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
