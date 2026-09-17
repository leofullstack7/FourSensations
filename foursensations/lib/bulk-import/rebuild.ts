import { buildBulkPreview, type BulkPreviewResult, type BulkRowFieldOverride } from "./build-preview";
import { listZipImages, listZipImagesFromManifest, type ZipImageEntry } from "./zip-manifest";
import type { CategoryRow } from "./category-resolve";
import {
  applyTintCatalogToPreview,
  readTintCatalogStateFromPreview,
  tintMatchScopeFromState,
  type TintCatalogState,
} from "./tint-catalog";
import { applyDeferredTaxonomyPlaceholders } from "@/lib/bulk-import/deferred-taxonomy";

function zipEntriesFromPreview(preview: BulkPreviewResult | null): ZipImageEntry[] {
  if (!preview) return [];
  const names = new Set<string>();
  for (const m of preview.imageMatches ?? []) {
    if (m.imageFilename) names.add(m.imageFilename);
  }
  for (const row of preview.rows ?? []) {
    for (const n of row.imageFileNames ?? []) names.add(n);
  }
  return listZipImagesFromManifest([...names].map((n) => ({ entryName: n, fileName: n })));
}

export function rebuildBulkPreview(params: {
  headers: string[];
  rows: { values: string[] }[];
  codeColumnIndex: number;
  zipBuffer?: Buffer | null;
  zipEntries?: ZipImageEntry[];
  defaultCategorySlug: string | null;
  categoryTree: CategoryRow[];
  taxonomyOverrides?: Record<string, { categorySlug: string; subcategoryName: string }>;
  rowTaxonomyOverrides?: Record<string, { categorySlug: string; subcategoryName: string }>;
  rowFieldOverrides?: Record<string, BulkRowFieldOverride>;
  taxonomyRehomeDismissed?: Record<string, boolean>;
  tintCatalog?: TintCatalogState;
  previousPreview?: BulkPreviewResult | null;
  taxonomyCreateDeferred?: boolean;
}): BulkPreviewResult {
  let entries: ZipImageEntry[] = params.zipEntries ?? [];
  if (!entries.length && params.zipBuffer && params.zipBuffer.length > 22) {
    try {
      entries = listZipImages(params.zipBuffer, { includeBuffers: false }).entries;
    } catch {
      entries = zipEntriesFromPreview(params.previousPreview ?? null);
    }
  }
  if (!entries.length) {
    entries = zipEntriesFromPreview(params.previousPreview ?? null);
  }
  const prevState = params.tintCatalog ?? readTintCatalogStateFromPreview(params.previousPreview ?? null);
  const tintMatchScope = tintMatchScopeFromState(prevState);

  const base = buildBulkPreview({
    headers: params.headers,
    dataRows: params.rows,
    codeColumnIndex: params.codeColumnIndex,
    zipEntries: entries,
    categoryTree: params.categoryTree,
    defaultCategorySlug: params.defaultCategorySlug,
    taxonomyOverrides: params.taxonomyOverrides,
    rowTaxonomyOverrides:
      params.rowTaxonomyOverrides ?? params.previousPreview?.rowTaxonomyOverrides ?? {},
    rowFieldOverrides: params.rowFieldOverrides ?? params.previousPreview?.rowFieldOverrides ?? {},
    taxonomyRehomeDismissed: params.taxonomyRehomeDismissed,
    tintMatchScope,
  });

  const withTint = applyTintCatalogToPreview(base, prevState);
  withTint.taxonomyCreateDeferred =
    params.taxonomyCreateDeferred ?? params.previousPreview?.taxonomyCreateDeferred === true;
  if (withTint.taxonomyCreateDeferred) {
    applyDeferredTaxonomyPlaceholders(withTint);
  }
  return withTint;
}
