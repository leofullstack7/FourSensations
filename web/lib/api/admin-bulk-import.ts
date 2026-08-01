import type { BulkPreviewResult } from "@/lib/bulk-import/build-preview";
import type { AdminProduct } from "@/lib/types/admin";

type ApiErrorBody = { error: string };

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as ApiErrorBody;
    return j.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

const fetchOpts = { credentials: "include" as const, headers: { Accept: "application/json" } };

export type BulkPreviewResponse = {
  jobId: string;
  preview: BulkPreviewResult;
  expiresAt: string;
};

export async function postBulkImportPreview(form: FormData): Promise<BulkPreviewResponse> {
  const res = await fetch("/api/admin/import/bulk/preview", {
    method: "POST",
    body: form,
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    if (res.status === 502 || res.status === 504 || res.status === 413) {
      throw new Error(
        "El servidor no pudo analizar este ZIP (timeout o tamaño). Optimiza las imágenes a WebP y vuelve a intentar; si sigue fallando, divide el lote.",
      );
    }
    throw new Error(await parseError(res));
  }
  return (await res.json()) as BulkPreviewResponse;
}

export type BulkZipOptimizeResult = {
  file: File;
  beforeBytes: number;
  afterBytes: number;
  savedBytes: number;
  savedPercent: number;
  imageCount: number;
  skippedCount: number;
};

export async function postBulkZipOptimize(zip: File): Promise<BulkZipOptimizeResult> {
  const fd = new FormData();
  fd.append("zip", zip);
  const res = await fetch("/api/admin/import/bulk/zip-optimize", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 502 || res.status === 504 || res.status === 413) {
      throw new Error(
        "El servidor no pudo optimizar este ZIP (límite de tiempo o tamaño). Usa la optimización en el navegador.",
      );
    }
    throw new Error(await parseError(res));
  }

  const blob = await res.blob();
  const beforeBytes = Number(res.headers.get("X-Zip-Before-Bytes") ?? 0);
  const afterBytes = Number(res.headers.get("X-Zip-After-Bytes") ?? 0);
  const savedBytes = Number(res.headers.get("X-Zip-Saved-Bytes") ?? 0);
  const savedPercent = Number(res.headers.get("X-Zip-Saved-Percent") ?? 0);
  const imageCount = Number(res.headers.get("X-Zip-Image-Count") ?? 0);
  const skippedCount = Number(res.headers.get("X-Zip-Skipped-Count") ?? 0);

  const baseName = zip.name.replace(/\.zip$/i, "");
  const file = new File([blob], `${baseName}-optimizado.zip`, { type: "application/zip" });

  return { file, beforeBytes, afterBytes, savedBytes, savedPercent, imageCount, skippedCount };
}

export async function patchBulkImportJob(
  jobId: string,
  body: {
    codeColumnIndex?: number;
    defaultCategorySlug?: string | null;
    selection?: boolean[];
    selectedRowIds?: string[];
    taxonomyOverrides?: Record<string, { categorySlug: string; subcategoryName: string }>;
    rowTaxonomyOverrides?: Record<string, { categorySlug: string; subcategoryName: string }>;
    taxonomyRehomeDismissed?: Record<string, boolean>;
    activeTintTypeCsvKey?: string | null;
    activeTintTypeId?: string | null;
    activeTintFamilyCsvKey?: string | null;
    activeTintFamilyId?: string | null;
    tintTypeLinks?: Record<string, string>;
    tintFamilyLinks?: Record<string, string>;
    defaultTintTypeApplied?: boolean;
    defaultTintFamilyApplied?: boolean;
    tintTypeOverrides?: Record<string, string>;
  }
): Promise<{ preview: BulkPreviewResult }> {
  const res = await fetch(`/api/admin/import/bulk/${jobId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { preview: BulkPreviewResult };
}

export async function deleteBulkImportJob(jobId: string): Promise<void> {
  const res = await fetch(`/api/admin/import/bulk/${jobId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok && res.status !== 404) throw new Error(await parseError(res));
}

export type BulkCommitResponse = {
  ok: boolean;
  imported: number;
  failed: number;
  /** Filas con código ya existente omitidas (sin código de barras para agrupar). */
  skippedExistingDuplicates?: number;
  /** Productos existentes a los que se asignó grupo de barras (modo omitir). */
  variantGroupsAssigned?: number;
  /** Grupos de barras con 2 o más productos tras el commit. */
  variantGroupsWithMultipleMembers?: number;
  /** Grupos de barras con un solo producto (no se verán unidos en la lista). */
  variantGroupsSingleton?: number;
  errors: string[];
  products: AdminProduct[];
};

export async function postBulkImportCommit(
  jobId: string,
  rowIds: string[],
  existingPolicy: "skip" | "replace"
): Promise<BulkCommitResponse> {
  const res = await fetch(`/api/admin/import/bulk/${jobId}/commit`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ rowIds, existingPolicy }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as BulkCommitResponse;
}

export type TintCatalogResolveResponse = {
  ok: boolean;
  families: { id: string; name: string }[];
  types: { id: string; name: string }[];
};

/** Crea familias/tipos de tinte en catálogo maestro (upsert, MAYÚSCULAS). */
export async function postTintResolveCatalog(body: {
  newFamilies: string[];
  newTypes: string[];
}): Promise<TintCatalogResolveResponse> {
  const res = await fetch("/api/admin/tints/resolve-catalog", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as TintCatalogResolveResponse;
}

