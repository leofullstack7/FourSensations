import { buildBulkPreview, type BulkPreviewResult } from "./build-preview";
import { listZipImages } from "./zip-manifest";
import type { CategoryRow } from "./category-resolve";

export function rebuildBulkPreview(params: {
  headers: string[];
  rows: { values: string[] }[];
  codeColumnIndex: number;
  zipBuffer: Buffer;
  defaultCategorySlug: string | null;
  categoryTree: CategoryRow[];
  taxonomyOverrides?: Record<string, { categorySlug: string; subcategoryName: string }>;
  taxonomyRehomeDismissed?: Record<string, boolean>;
}): BulkPreviewResult {
  const { entries } = listZipImages(params.zipBuffer);
  return buildBulkPreview({
    headers: params.headers,
    dataRows: params.rows,
    codeColumnIndex: params.codeColumnIndex,
    zipEntries: entries,
    categoryTree: params.categoryTree,
    defaultCategorySlug: params.defaultCategorySlug,
    taxonomyOverrides: params.taxonomyOverrides,
    taxonomyRehomeDismissed: params.taxonomyRehomeDismissed,
  });
}
