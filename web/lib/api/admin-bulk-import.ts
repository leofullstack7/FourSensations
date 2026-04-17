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
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as BulkPreviewResponse;
}

export async function patchBulkImportJob(
  jobId: string,
  body: {
    codeColumnIndex?: number;
    defaultCategorySlug?: string | null;
    selection?: boolean[];
    selectedRowIds?: string[];
    taxonomyOverrides?: Record<string, { categorySlug: string; subcategoryName: string }>;
    taxonomyRehomeDismissed?: Record<string, boolean>;
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
  /** Filas con código ya existente omitidas (política «no reemplazar»). */
  skippedExistingDuplicates?: number;
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

