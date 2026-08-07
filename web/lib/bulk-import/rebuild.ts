import { buildBulkPreview, type BulkPreviewResult, type BulkRowFieldOverride } from "./build-preview";
import { listZipImages } from "./zip-manifest";
import type { CategoryRow } from "./category-resolve";
import {
  applyTintCatalogToPreview,
  readTintCatalogStateFromPreview,
  tintMatchScopeFromState,
  type TintCatalogState,
} from "./tint-catalog";
import { applyDeferredTaxonomyPlaceholders } from "@/lib/bulk-import/deferred-taxonomy";

export function rebuildBulkPreview(params: {
  headers: string[];
  rows: { values: string[] }[];
  codeColumnIndex: number;
  zipBuffer: Buffer;
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
  const { entries } = listZipImages(params.zipBuffer, { includeBuffers: false });
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
