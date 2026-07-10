export type ZipImageStat = {
  path: string;
  fileName: string;
  bytes: number;
};

export type ZipInspectResult = {
  zipBytes: number;
  imageCount: number;
  totalImageBytes: number;
  images: ZipImageStat[];
  largest: ZipImageStat | null;
};

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"]);

function extname(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function isIgnoredPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.includes("__macosx") || lower.endsWith(".ds_store");
}

export function formatZipBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Analiza un ZIP en el navegador (sin subir al servidor). */
export async function inspectZipFileClient(file: File): Promise<ZipInspectResult> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const images: ZipImageStat[] = [];

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const normalized = path.replace(/\\/g, "/");
    if (isIgnoredPath(normalized)) continue;
    const ext = extname(normalized);
    if (!IMAGE_EXT.has(ext)) continue;
    const data = await entry.async("uint8array");
    const fileName = normalized.split("/").pop() ?? normalized;
    images.push({ path: normalized, fileName, bytes: data.byteLength });
  }

  images.sort((a, b) => b.bytes - a.bytes);
  const totalImageBytes = images.reduce((sum, img) => sum + img.bytes, 0);

  return {
    zipBytes: file.size,
    imageCount: images.length,
    totalImageBytes,
    images,
    largest: images[0] ?? null,
  };
}
