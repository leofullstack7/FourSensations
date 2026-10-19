import sharp from "sharp";

/** Límite de lado largo para fotos de Contenido / admin (widgets ~1600px). */
export const ADMIN_IMAGE_MAX_EDGE = 1920;
export const ADMIN_WEBP_QUALITY = 82;
/** Si el WebP ya es liviano, no re-encodear. */
const SKIP_WEBP_MAX_BYTES = 220_000;

export type OptimizedImageResult = {
  buffer: Buffer;
  contentType: "image/webp";
  beforeBytes: number;
  afterBytes: number;
  optimized: boolean;
  width: number;
  height: number;
};

/**
 * Reduce tamaño y convierte a WebP (orientación EXIF, sin agrandar).
 * Si falla el encode, devuelve el buffer original con contentType genérico vía throw
 * — el caller decide el fallback.
 */
export async function optimizeImageToWebp(
  input: Buffer,
  opts?: { maxEdge?: number; quality?: number },
): Promise<OptimizedImageResult> {
  const beforeBytes = input.length;
  const maxEdge = opts?.maxEdge ?? ADMIN_IMAGE_MAX_EDGE;
  const quality = opts?.quality ?? ADMIN_WEBP_QUALITY;

  const meta = await sharp(input, { animated: false, failOn: "none" }).metadata();
  const isWebp = meta.format === "webp";
  if (isWebp && beforeBytes <= SKIP_WEBP_MAX_BYTES) {
    return {
      buffer: input,
      contentType: "image/webp",
      beforeBytes,
      afterBytes: beforeBytes,
      optimized: false,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    };
  }

  const pipeline = sharp(input, { animated: false, failOn: "none" })
    .rotate()
    .resize(maxEdge, maxEdge, {
      fit: "inside",
      withoutEnlargement: true,
    });

  const { data, info } = await pipeline
    .webp({ quality, effort: 4, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  // Si por algún motivo el WebP queda más pesado, conservar el menor.
  if (data.length >= beforeBytes && isWebp) {
    return {
      buffer: input,
      contentType: "image/webp",
      beforeBytes,
      afterBytes: beforeBytes,
      optimized: false,
      width: meta.width ?? info.width,
      height: meta.height ?? info.height,
    };
  }

  return {
    buffer: data,
    contentType: "image/webp",
    beforeBytes,
    afterBytes: data.length,
    optimized: true,
    width: info.width,
    height: info.height,
  };
}

export function formatBytesSaved(before: number, after: number): string {
  const saved = Math.max(0, before - after);
  if (saved < 1024) return `${saved} B`;
  if (saved < 1024 * 1024) return `${(saved / 1024).toFixed(0)} KB`;
  return `${(saved / (1024 * 1024)).toFixed(1)} MB`;
}
