import { NextRequest, NextResponse } from "next/server";
import { BulkImportStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { fetchCategoryTreeForImport } from "@/lib/server/admin-category-tree";
import { rebuildBulkPreview } from "@/lib/bulk-import/rebuild";
import { bulkImportStableRowId } from "@/lib/bulk-import/bulk-import-row-id";
import type { BulkPreviewResult } from "@/lib/bulk-import/build-preview";
import { markBulkPreviewExistingByExternalRef } from "@/lib/server/bulk-import-mark-existing";
import { fetchTintCatalogFromDb } from "@/lib/server/tint-catalog-db";
import { readTintCatalogStateFromPreview } from "@/lib/bulk-import/tint-catalog";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: { jobId: string } };

const taxonomyOverrideEntry = z.object({
  categorySlug: z.string().min(1),
  subcategoryName: z.string().min(1),
});

const tintRowSelectionEntry = z.object({
  tintFamilyId: z.string().min(1),
  tintTypeId: z.string().min(1),
});

const patchSchema = z.object({
  codeColumnIndex: z.number().int().min(0).optional(),
  selection: z.array(z.boolean()).optional(),
  selectedRowIds: z.array(z.string().min(1)).optional(),
  taxonomyOverrides: z.record(z.string(), taxonomyOverrideEntry).optional(),
  taxonomyRehomeDismissed: z.record(z.string(), z.boolean()).optional(),
  /** Tipo Tintes activo para esta importación (un tipo por carga). */
  activeTintTypeCsvKey: z.string().min(1).nullable().optional(),
  activeTintTypeId: z.string().min(1).nullable().optional(),
  tintTypeLinks: z.record(z.string(), z.string()).optional(),
  /** @deprecated */
  tintFamilyLinks: z.record(z.string(), z.string()).optional(),
  tintRowSelections: z.record(z.string(), tintRowSelectionEntry).optional(),
});

function readTaxonomyStateFromJob(jobPreview: unknown): {
  overrides: Record<string, { categorySlug: string; subcategoryName: string }>;
  dismissed: Record<string, boolean>;
} {
  const p = jobPreview as BulkPreviewResult | null;
  if (!p || typeof p !== "object") {
    return { overrides: {}, dismissed: {} };
  }
  return {
    overrides:
      p.taxonomyOverrides && typeof p.taxonomyOverrides === "object"
        ? p.taxonomyOverrides
        : {},
    dismissed:
      p.taxonomyRehomeDismissed && typeof p.taxonomyRehomeDismissed === "object"
        ? p.taxonomyRehomeDismissed
        : {},
  };
}

function parseHeadersRows(job: { headers: unknown; rows: unknown }): {
  headers: string[];
  rows: { values: string[] }[];
} {
  const headers = Array.isArray(job.headers) ? job.headers.map((h) => String(h ?? "")) : [];
  const rows: { values: string[] }[] = [];
  if (Array.isArray(job.rows)) {
    for (const r of job.rows) {
      if (r && typeof r === "object" && "values" in r && Array.isArray((r as { values: unknown }).values)) {
        rows.push({ values: (r as { values: string[] }).values.map((v) => String(v ?? "")) });
      }
    }
  }
  return { headers, rows };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { jobId } = params;
  const job = await prisma.bulkImportJob.findUnique({ where: { id: jobId } });
  if (!job) return noStoreJson({ error: "Job no encontrado" }, { status: 404 });
  if (job.status !== BulkImportStatus.PREVIEW) {
    return noStoreJson({ error: "El job no está en modo preview" }, { status: 409 });
  }
  if (job.expiresAt.getTime() < Date.now()) {
    await prisma.bulkImportJob.delete({ where: { id: jobId } }).catch(() => {});
    return noStoreJson({ error: "La sesión de importación expiró" }, { status: 410 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ error: parsed.error.message }, { status: 400 });
  }

  const { headers, rows } = parseHeadersRows(job);
  if (headers.length === 0 || rows.length === 0) {
    return noStoreJson({ error: "Job corrupto (sin datos CSV)" }, { status: 500 });
  }

  let codeColumnIndex = parsed.data.codeColumnIndex ?? job.codeColumnIndex;
  if (codeColumnIndex < 0 || codeColumnIndex >= headers.length) {
    return noStoreJson({ error: "codeColumnIndex fuera de rango" }, { status: 400 });
  }

  const categoryTree = await fetchCategoryTreeForImport();
  const prevTax = readTaxonomyStateFromJob(job.previewPayload);
  const taxonomyOverrides = {
    ...prevTax.overrides,
    ...(parsed.data.taxonomyOverrides ?? {}),
  };
  const taxonomyRehomeDismissed = {
    ...prevTax.dismissed,
    ...(parsed.data.taxonomyRehomeDismissed ?? {}),
  };
  const prevTint = readTintCatalogStateFromPreview(job.previewPayload as BulkPreviewResult);
  const tintTypeLinks = { ...prevTint.tintTypeLinks, ...(parsed.data.tintTypeLinks ?? {}) };
  let activeTintTypeCsvKey =
    parsed.data.activeTintTypeCsvKey !== undefined
      ? parsed.data.activeTintTypeCsvKey
      : prevTint.activeTintTypeCsvKey;
  let activeTintTypeId =
    parsed.data.activeTintTypeId !== undefined ? parsed.data.activeTintTypeId : prevTint.activeTintTypeId;

  const tintCatalogDb = await fetchTintCatalogFromDb(prisma);
  const preview = rebuildBulkPreview({
    headers,
    rows,
    codeColumnIndex,
    zipBuffer: Buffer.from(job.zipBlob),
    defaultCategorySlug: null,
    categoryTree,
    taxonomyOverrides,
    taxonomyRehomeDismissed,
    tintCatalog: {
      existingTintFamilies: tintCatalogDb.families,
      existingTintTypes: tintCatalogDb.types,
      activeTintTypeCsvKey,
      activeTintTypeId,
      tintTypeLinks,
    },
  });
  await markBulkPreviewExistingByExternalRef(prisma, preview);

  const statsStored = {
    ...preview.stats,
    defaultCategorySlug: null,
  };

  if (parsed.data.selection && Array.isArray(parsed.data.selection)) {
    const sel = parsed.data.selection;
    if (sel.length === preview.rows.length) {
      for (let i = 0; i < preview.rows.length; i++) {
        preview.rows[i]!.selected = !!sel[i];
      }
    }
  }
  if (parsed.data.selectedRowIds && Array.isArray(parsed.data.selectedRowIds)) {
    const idSet = new Set(parsed.data.selectedRowIds);
    for (const r of preview.rows) {
      r.selected = idSet.has(bulkImportStableRowId(r));
    }
    for (const r of preview.matchedRows) {
      r.selected = idSet.has(bulkImportStableRowId(r));
    }
    for (const r of preview.unmatchedRows) {
      r.selected = false;
    }
    for (const r of preview.ambiguousRows) {
      r.selected = false;
    }
  }

  await prisma.bulkImportJob.update({
    where: { id: jobId },
    data: {
      codeColumnIndex,
      selectedCodeHeader: headers[codeColumnIndex] ?? "",
      previewPayload: preview as unknown as object,
      stats: statsStored as unknown as object,
    },
  });

  return noStoreJson({ preview });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { jobId } = params;
  try {
    await prisma.bulkImportJob.delete({ where: { id: jobId } });
  } catch {
    return noStoreJson({ error: "Job no encontrado" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
