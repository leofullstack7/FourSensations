import type { BulkPreviewStats } from "@/lib/bulk-import/build-preview";

/** Umbral mínimo de coincidencia CSV↔ZIP antes de pedir confirmación al admin. */
export const BULK_CSV_ZIP_MIN_MATCH_RATE = 0.03;

export type BulkCsvZipMatchBreakdown = {
  csvMatchRate: number;
  zipMatchRate: number;
  overallMatchRate: number;
  matchedCsvRows: number;
  totalCsvRows: number;
  matchedZipImages: number;
  totalZipImages: number;
};

export function computeBulkCsvZipMatchBreakdown(stats: BulkPreviewStats): BulkCsvZipMatchBreakdown {
  const totalCsvRows = stats.totalRows;
  const matchedCsvRows = stats.matchedRows;
  const totalZipImages = stats.zipImageFiles;
  const matchedZipImages = Math.max(0, stats.zipImageFiles - stats.unmatchedImages);

  const csvMatchRate = totalCsvRows > 0 ? matchedCsvRows / totalCsvRows : 0;
  const zipMatchRate = totalZipImages > 0 ? matchedZipImages / totalZipImages : 0;

  let overallMatchRate = 0;
  if (totalCsvRows > 0 && totalZipImages > 0) {
    overallMatchRate = Math.min(csvMatchRate, zipMatchRate);
  } else if (totalCsvRows > 0) {
    overallMatchRate = csvMatchRate;
  } else if (totalZipImages > 0) {
    overallMatchRate = zipMatchRate;
  }

  return {
    csvMatchRate,
    zipMatchRate,
    overallMatchRate,
    matchedCsvRows,
    totalCsvRows,
    matchedZipImages,
    totalZipImages,
  };
}

export function isBulkCsvZipMatchRateTooLow(stats: BulkPreviewStats): boolean {
  return computeBulkCsvZipMatchBreakdown(stats).overallMatchRate < BULK_CSV_ZIP_MIN_MATCH_RATE;
}

export function formatBulkMatchPercent(rate: number): string {
  return `${(rate * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`;
}
