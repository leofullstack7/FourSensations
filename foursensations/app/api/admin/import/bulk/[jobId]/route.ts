import { NextRequest, NextResponse } from "next/server";
import { BulkImportStatus } from "@prisma/client";
import { z } from "zod";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { fetchCategoryTreeForImport } from "@/lib/server/admin-category-tree";
import { rebuildBulkPreview } from "@/lib/bulk-import/rebuild";
import { bulkImportStableRowId } from "@/lib/bulk-import/bulk-import-row-id";
import type { BulkPreviewResult } from "@/lib/bulk-import/build-preview";
import { markBulkPreviewExistingByExternalRef } from "@/lib/server/bulk-import-mark-existing";
import { fetchTintCatalogFromDb } from "@/lib/server/tint-catalog-db";
import { readTintCatalogStateFromPreview } from "@/lib/bulk-import/tint-catalog";
import {
  deleteBulkImportZip,
  resolveBulkImportZipBuffer,
} from "@/lib/server/bulk-import-zip-store";
import {
  applyBulkRowCombines,
  validateBulkRowCombine,
  type BulkRowCombineSpec,
} from "@/lib/bulk-import/bulk-row-combine";
import { effectiveProductTitle } from "@/lib/bulk-import/semantic-map";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

type Ctx = { params: { jobId: string } };

const taxonomyOverrideEntry = z.object({
  categorySlug: z.string().min(1),
  subcategoryName: z.string().min(1),
});

const rowFieldOverrideEntry = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().nullable().optional(),
  stock: z.number().int().nullable().optional(),
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
  rowTaxonomyOverrides: z.record(z.string(), taxonomyOverrideEntry).optional(),
  rowFieldOverrides: z.record(z.string(), rowFieldOverrideEntry).optional(),
  taxonomyRehomeDismissed: z.record(z.string(), z.boolean()).optional(),
  /** Tipo Tintes activo para esta importación (un tipo por carga). */
  activeTintTypeCsvKey: z.string().min(1).nullable().optional(),
  activeTintTypeId: z.string().min(1).nullable().optional(),
  activeTintFamilyCsvKey: z.string().min(1).nullable().optional(),
  activeTintFamilyId: z.string().min(1).nullable().optional(),
  tintTypeLinks: z.record(z.string(), z.string()).optional(),
  tintFamilyLinks: z.record(z.string(), z.string()).optional(),
  defaultTintTypeApplied: z.boolean().optional(),
  defaultTintFamilyApplied: z.boolean().optional(),
  tintTypeOverrides: z.record(z.string(), z.string()).optional(),
  tintRowSelections: z.record(z.string(), tintRowSelectionEntry).optional(),
  /** Crear categorías/subcategorías nuevas solo en el commit. */
  taxonomyCreateDeferred: z.boolean().optional(),
  /** Combinar filas nuevas en un solo producto (fusiona imágenes). */
  combineRows: z
    .object({
      survivorPreviewRowId: z.string().min(1),
      absorbedPreviewRowIds: z.array(z.string().min(1)).min(1),
      name: z.string().min(1),
    })
    .optional(),
});

function readTaxonomyStateFromJob(jobPreview: unknown): {
  overrides: Record<string, { categorySlug: string; subcategoryName: string }>;
  rowOverrides: Record<string, { categorySlug: string; subcategoryName: string }>;
  fieldOverrides: NonNullable<BulkPreviewResult["rowFieldOverrides"]>;
  dismissed: Record<string, boolean>;
} {
  const p = jobPreview as BulkPreviewResult | null;
  if (!p || typeof p !== "object") {
    return { overrides: {}, rowOverrides: {}, fieldOverrides: {}, dismissed: {} };
  }
  return {
    overrides:
      p.taxonomyOverrides && typeof p.taxonomyOverrides === "object"
        ? p.taxonomyOverrides
        : {},
    rowOverrides:
      p.rowTaxonomyOverrides && typeof p.rowTaxonomyOverrides === "object"
        ? p.rowTaxonomyOverrides
        : {},
    fieldOverrides:
      p.rowFieldOverrides && typeof p.rowFieldOverrides === "object" ? p.rowFieldOverrides : {},
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
  const job = await withPrismaRetry(() => prisma.bulkImportJob.findUnique({ where: { id: jobId } }));
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

  const categoryTree = await withPrismaRetry(() => fetchCategoryTreeForImport());
  const prevTax = readTaxonomyStateFromJob(job.previewPayload);
  const taxonomyOverrides = {
    ...prevTax.overrides,
    ...(parsed.data.taxonomyOverrides ?? {}),
  };
  const rowTaxonomyOverrides = {
    ...prevTax.rowOverrides,
    ...(parsed.data.rowTaxonomyOverrides ?? {}),
  };
  const rowFieldOverrides = {
    ...prevTax.fieldOverrides,
    ...(parsed.data.rowFieldOverrides ?? {}),
  };
  const taxonomyRehomeDismissed = {
    ...prevTax.dismissed,
    ...(parsed.data.taxonomyRehomeDismissed ?? {}),
  };
  const prevTint = readTintCatalogStateFromPreview(job.previewPayload as BulkPreviewResult);
  const tintTypeLinks = { ...prevTint.tintTypeLinks, ...(parsed.data.tintTypeLinks ?? {}) };
  const tintFamilyLinks = { ...prevTint.tintFamilyLinks, ...(parsed.data.tintFamilyLinks ?? {}) };
  const tintTypeOverrides = {
    ...(prevTint.tintTypeOverrides ?? {}),
    ...(parsed.data.tintTypeOverrides ?? {}),
  };
  const defaultTintTypeApplied =
    parsed.data.defaultTintTypeApplied !== undefined
      ? parsed.data.defaultTintTypeApplied
      : prevTint.defaultTintTypeApplied === true;
  const defaultTintFamilyApplied =
    parsed.data.defaultTintFamilyApplied !== undefined
      ? parsed.data.defaultTintFamilyApplied
      : prevTint.defaultTintFamilyApplied === true;
  let activeTintTypeCsvKey =
    parsed.data.activeTintTypeCsvKey !== undefined
      ? parsed.data.activeTintTypeCsvKey
      : prevTint.activeTintTypeCsvKey;
  let activeTintTypeId =
    parsed.data.activeTintTypeId !== undefined ? parsed.data.activeTintTypeId : prevTint.activeTintTypeId;
  let activeTintFamilyCsvKey =
    parsed.data.activeTintFamilyCsvKey !== undefined
      ? parsed.data.activeTintFamilyCsvKey
      : prevTint.activeTintFamilyCsvKey;
  let activeTintFamilyId =
    parsed.data.activeTintFamilyId !== undefined
      ? parsed.data.activeTintFamilyId
      : prevTint.activeTintFamilyId;

  if (
    parsed.data.activeTintTypeCsvKey !== undefined &&
    parsed.data.activeTintTypeCsvKey !== prevTint.activeTintTypeCsvKey &&
    parsed.data.activeTintFamilyCsvKey === undefined
  ) {
    activeTintFamilyCsvKey = null;
    activeTintFamilyId = null;
  }

  const tintCatalogDb = await withPrismaRetry(() => fetchTintCatalogFromDb(prisma));
  let zipBuffer: Buffer | null = null;
  try {
    zipBuffer = await resolveBulkImportZipBuffer(jobId, job.zipBlob);
  } catch {
    zipBuffer = null;
  }

  const preview = rebuildBulkPreview({
    headers,
    rows,
    codeColumnIndex,
    zipBuffer,
    defaultCategorySlug: null,
    categoryTree,
    taxonomyOverrides,
    rowTaxonomyOverrides,
    rowFieldOverrides,
    taxonomyRehomeDismissed,
    previousPreview: job.previewPayload as BulkPreviewResult | null,
    taxonomyCreateDeferred:
      parsed.data.taxonomyCreateDeferred !== undefined
        ? parsed.data.taxonomyCreateDeferred
        : (job.previewPayload as BulkPreviewResult | null)?.taxonomyCreateDeferred === true,
    tintCatalog: {
      existingTintFamilies: tintCatalogDb.families,
      existingTintTypes: tintCatalogDb.types,
      activeTintTypeCsvKey,
      activeTintTypeId,
      activeTintFamilyCsvKey,
      activeTintFamilyId,
      tintTypeLinks,
      tintFamilyLinks,
      defaultTintTypeApplied,
      defaultTintFamilyApplied,
      tintTypeOverrides,
    },
  });
  await withPrismaRetry(() => markBulkPreviewExistingByExternalRef(prisma, preview));
  if (preview.taxonomyCreateDeferred) {
    const { applyDeferredTaxonomyPlaceholders } = await import("@/lib/bulk-import/deferred-taxonomy");
    applyDeferredTaxonomyPlaceholders(preview);
  }

  const prevPreview = job.previewPayload as BulkPreviewResult | null;
  let rowCombines: BulkRowCombineSpec[] = Array.isArray(prevPreview?.rowCombines)
    ? [...prevPreview!.rowCombines!]
    : [];

  if (parsed.data.combineRows) {
    const spec = parsed.data.combineRows;
    const byId = new Map(preview.rows.map((r) => [bulkImportStableRowId(r), r]));
    const survivor = byId.get(spec.survivorPreviewRowId);
    const absorbed = spec.absorbedPreviewRowIds
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => !!r);
    if (!survivor || absorbed.length === 0) {
      return noStoreJson({ error: "No se encontraron las filas a combinar" }, { status: 400 });
    }
    const check = validateBulkRowCombine([survivor, ...absorbed]);
    if (!check.ok) {
      return noStoreJson({ error: check.reason }, { status: 400 });
    }
    const name =
      spec.name.trim() ||
      effectiveProductTitle(survivor.mapped) ||
      survivor.mapped.name ||
      "Producto";
    // Quitar absorbs previos que se reabsorben
    const absorbSet = new Set(spec.absorbedPreviewRowIds);
    rowCombines = rowCombines
      .map((c) => ({
        ...c,
        absorbedPreviewRowIds: c.absorbedPreviewRowIds.filter((id) => !absorbSet.has(id)),
      }))
      .filter((c) => c.absorbedPreviewRowIds.length > 0 || c.survivorPreviewRowId === spec.survivorPreviewRowId);
    rowCombines = rowCombines.filter((c) => c.survivorPreviewRowId !== spec.survivorPreviewRowId);
    rowCombines.push({
      survivorPreviewRowId: spec.survivorPreviewRowId,
      absorbedPreviewRowIds: [...new Set(spec.absorbedPreviewRowIds)],
      name,
    });
    // Nombre en override para que rebuilds posteriores lo conserven
    rowFieldOverrides[spec.survivorPreviewRowId] = {
      ...(rowFieldOverrides[spec.survivorPreviewRowId] ?? {}),
      name,
    };
  }

  applyBulkRowCombines(preview, rowCombines);
  preview.rowFieldOverrides = rowFieldOverrides;

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

  await withPrismaRetry(() =>
    prisma.bulkImportJob.update({
      where: { id: jobId },
      data: {
        codeColumnIndex,
        selectedCodeHeader: headers[codeColumnIndex] ?? "",
        previewPayload: preview as unknown as object,
        stats: statsStored as unknown as object,
      },
    })
  );

  return noStoreJson({ preview });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { jobId } = params;
  try {
    await prisma.bulkImportJob.delete({ where: { id: jobId } });
    await deleteBulkImportZip(jobId);
  } catch {
    return noStoreJson({ error: "Job no encontrado" }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
