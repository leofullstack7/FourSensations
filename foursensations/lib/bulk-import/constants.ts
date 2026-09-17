/** Límites de carga masiva (FASE 2). */
export const BULK_CSV_MAX_BYTES = 2 * 1024 * 1024;
export const BULK_ZIP_MAX_BYTES = 80 * 1024 * 1024;
export const BULK_MAX_ROWS = 500;
export const BULK_MAX_ZIP_IMAGES = 2000;
export const BULK_JOB_TTL_HOURS = 24;

export const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
