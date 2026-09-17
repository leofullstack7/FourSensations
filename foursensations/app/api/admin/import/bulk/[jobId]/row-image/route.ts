import { NextRequest } from "next/server";
import AdmZip from "adm-zip";
import { BulkImportStatus } from "@prisma/client";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { bulkImportStableRowId } from "@/lib/bulk-import/bulk-import-row-id";
import type { BulkPreviewResult } from "@/lib/bulk-import/build-preview";
import { rebuildBulkPreview } from "@/lib/bulk-import/rebuild";
import { readTintCatalogStateFromPreview } from "@/lib/bulk-import/tint-catalog";
import { fetchCategoryTreeForImport } from "@/lib/server/admin-category-tree";
import { fetchTintCatalogFromDb } from "@/lib/server/tint-catalog-db";
import { markBulkPreviewExistingByExternalRef } from "@/lib/server/bulk-import-mark-existing";
import {
  resolveBulkImportZipBuffer,
  saveBulkImportZip,
} from "@/lib/server/bulk-import-zip-store";
import { canonicalExternalRef } from "@/lib/bulk-import/variant-group-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

type Ctx = { params: { jobId: string } };

const IMAGE_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function extFromNameOrMime(name: string, mime: string): string {
  const fromMime = IMAGE_MIME[mime.toLowerCase()];
  if (fromMime) return fromMime;
  const i = name.lastIndexOf(".");
  if (i >= 0) {
    const e = name.slice(i).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"].includes(e)) {
      return e === ".jpeg" ? ".jpg" : e;
    }
  }
  return ".webp";
}

function readTaxonomyFromPreview(preview: BulkPreviewResult | null) {
  return {
    overrides: preview?.taxonomyOverrides ?? {},
    rowOverrides: preview?.rowTaxonomyOverrides ?? {},
    fieldOverrides: preview?.rowFieldOverrides ?? {},
    dismissed: preview?.taxonomyRehomeDismissed ?? {},
  };
}

/**
 * Añade o reemplaza la imagen de una fila en el ZIP del job y regenera el preview.
 * El nombre del archivo = código de la fila (para el match).
 */
export async function POST(req: NextRequest, { params }: Ctx) {
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return noStoreJson({ error: "FormData inválido" }, { status: 400 });
  }

  const rowId = String(form.get("rowId") ?? "").trim();
  const file = form.get("file");
  if (!rowId) return noStoreJson({ error: "Falta rowId" }, { status: 400 });
  if (!(file instanceof Blob) || file.size <= 0) {
    return noStoreJson({ error: "Falta archivo de imagen" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return noStoreJson({ error: "La imagen no puede superar 12 MB" }, { status: 400 });
  }

  const preview = job.previewPayload as BulkPreviewResult | null;
  if (!preview?.rows?.length) {
    return noStoreJson({ error: "Preview no disponible" }, { status: 500 });
  }

  const row = preview.rows.find((r) => bulkImportStableRowId(r) === rowId);
  if (!row) return noStoreJson({ error: "Fila no encontrada en el preview" }, { status: 404 });

  const code =
    canonicalExternalRef(row.normalizedCode) ||
    canonicalExternalRef(row.codeRaw) ||
    row.codeRaw?.trim() ||
    null;
  if (!code) {
    return noStoreJson({ error: "La fila no tiene código para nombrar la imagen" }, { status: 400 });
  }

  const fileName = file instanceof File ? file.name : "upload.webp";
  const mime = file.type || "image/webp";
  const ext = extFromNameOrMime(fileName, mime);
  const entryName = `${code}${ext}`;

  let zipBuffer: Buffer;
  try {
    zipBuffer = await resolveBulkImportZipBuffer(jobId, job.zipBlob);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ZIP no disponible";
    return noStoreJson({ error: msg }, { status: 409 });
  }

  const zip = new AdmZip(zipBuffer);
  const codeLower = code.toLowerCase();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const base = entry.entryName.replace(/^.*\//, "").replace(/\.[^.]+$/, "");
    if (base.toLowerCase() === codeLower) {
      zip.deleteFile(entry.entryName);
    }
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  zip.addFile(entryName, bytes);
  const nextZip = zip.toBuffer();
  await saveBulkImportZip(jobId, nextZip);

  const headers = Array.isArray(job.headers) ? job.headers.map((h) => String(h ?? "")) : [];
  const rawRows: { values: string[] }[] = [];
  if (Array.isArray(job.rows)) {
    for (const r of job.rows) {
      if (r && typeof r === "object" && "values" in r && Array.isArray((r as { values: unknown }).values)) {
        rawRows.push({ values: (r as { values: string[] }).values.map((v) => String(v ?? "")) });
      }
    }
  }
  if (headers.length === 0 || rawRows.length === 0) {
    return noStoreJson({ error: "Job corrupto (sin datos CSV)" }, { status: 500 });
  }

  const tax = readTaxonomyFromPreview(preview);
  const tintCatalogDb = await withPrismaRetry(() => fetchTintCatalogFromDb(prisma));
  const prevTint = readTintCatalogStateFromPreview(preview);
  const categoryTree = await withPrismaRetry(() => fetchCategoryTreeForImport());

  const nextPreview = rebuildBulkPreview({
    headers,
    rows: rawRows,
    codeColumnIndex: job.codeColumnIndex,
    zipBuffer: nextZip,
    defaultCategorySlug: null,
    categoryTree,
    taxonomyOverrides: tax.overrides,
    rowTaxonomyOverrides: tax.rowOverrides,
    rowFieldOverrides: tax.fieldOverrides,
    taxonomyRehomeDismissed: tax.dismissed,
    previousPreview: preview,
    tintCatalog: {
      existingTintFamilies: tintCatalogDb.families,
      existingTintTypes: tintCatalogDb.types,
      activeTintTypeCsvKey: prevTint.activeTintTypeCsvKey,
      activeTintTypeId: prevTint.activeTintTypeId,
      activeTintFamilyCsvKey: prevTint.activeTintFamilyCsvKey,
      activeTintFamilyId: prevTint.activeTintFamilyId,
      tintTypeLinks: prevTint.tintTypeLinks,
      tintFamilyLinks: prevTint.tintFamilyLinks,
      defaultTintTypeApplied: prevTint.defaultTintTypeApplied === true,
      defaultTintFamilyApplied: prevTint.defaultTintFamilyApplied === true,
      tintTypeOverrides: prevTint.tintTypeOverrides,
    },
  });
  await withPrismaRetry(() => markBulkPreviewExistingByExternalRef(prisma, nextPreview));

  await withPrismaRetry(() =>
    prisma.bulkImportJob.update({
      where: { id: jobId },
      data: {
        previewPayload: nextPreview as unknown as object,
        stats: nextPreview.stats as unknown as object,
      },
    })
  );

  return noStoreJson({
    preview: nextPreview,
    imageFilename: entryName,
    rowId,
  });
}
