import { NextRequest } from "next/server";
import { BulkImportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { fetchCategoryTreeForImport } from "@/lib/server/admin-category-tree";
import { parseCsv, pickCodeColumnIndex } from "@/lib/bulk-import/csv";
import { listZipImages } from "@/lib/bulk-import/zip-manifest";
import { buildBulkPreview } from "@/lib/bulk-import/build-preview";
import { markBulkPreviewExistingByExternalRef } from "@/lib/server/bulk-import-mark-existing";
import {
  BULK_CSV_MAX_BYTES,
  BULK_JOB_TTL_HOURS,
  BULK_MAX_ROWS,
  BULK_MAX_ZIP_IMAGES,
  BULK_ZIP_MAX_BYTES,
} from "@/lib/bulk-import/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const form = await req.formData();
    const csvFile = form.get("csv");
    const zipFile = form.get("zip");

    if (!(csvFile instanceof Blob)) {
      return noStoreJson({ error: "Falta archivo CSV (campo csv)" }, { status: 400 });
    }
    if (!(zipFile instanceof Blob)) {
      return noStoreJson({ error: "Falta archivo ZIP (campo zip)" }, { status: 400 });
    }

    if (csvFile.size > BULK_CSV_MAX_BYTES) {
      return noStoreJson({ error: `CSV demasiado grande (máx. ${BULK_CSV_MAX_BYTES / (1024 * 1024)} MB)` }, { status: 400 });
    }
    if (zipFile.size > BULK_ZIP_MAX_BYTES) {
      return noStoreJson({ error: `ZIP demasiado grande (máx. ${BULK_ZIP_MAX_BYTES / (1024 * 1024)} MB)` }, { status: 400 });
    }

    const csvBuf = Buffer.from(await csvFile.arrayBuffer());
    const zipBuf = Buffer.from(await zipFile.arrayBuffer());
    const csvText = csvBuf.toString("utf8");

    const { delimiter, headers, rows } = parseCsv(csvText);
    if (rows.length === 0) {
      return noStoreJson({ error: "El CSV no tiene filas de datos" }, { status: 400 });
    }
    if (rows.length > BULK_MAX_ROWS) {
      return noStoreJson({ error: `Demasiadas filas (máx. ${BULK_MAX_ROWS})` }, { status: 400 });
    }

    const { entries } = listZipImages(zipBuf);
    if (entries.length > BULK_MAX_ZIP_IMAGES) {
      return noStoreJson({ error: `Demasiadas imágenes en el ZIP (máx. ${BULK_MAX_ZIP_IMAGES})` }, { status: 400 });
    }

    const codeColumnIndex = pickCodeColumnIndex(headers, rows);
    const categoryTree = await fetchCategoryTreeForImport();

    const preview = buildBulkPreview({
      headers,
      dataRows: rows,
      codeColumnIndex,
      zipEntries: entries,
      categoryTree,
      defaultCategorySlug: null,
    });
    await markBulkPreviewExistingByExternalRef(prisma, preview);

    const statsStored = {
      ...preview.stats,
      defaultCategorySlug: null,
    };

    const expiresAt = new Date(Date.now() + BULK_JOB_TTL_HOURS * 60 * 60 * 1000);
    const job = await prisma.bulkImportJob.create({
      data: {
        expiresAt,
        status: BulkImportStatus.PREVIEW,
        selectedCodeHeader: headers[codeColumnIndex] ?? "",
        codeColumnIndex,
        csvDelimiter: delimiter,
        headers: headers as unknown as object[],
        rows: rows as unknown as object[],
        previewPayload: preview as unknown as object,
        stats: statsStored as unknown as object,
        zipBlob: zipBuf,
      },
    });

    return noStoreJson({
      jobId: job.id,
      preview,
      expiresAt: job.expiresAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al analizar archivos";
    console.error("[POST /api/admin/import/bulk/preview]", e);
    return noStoreJson({ error: msg }, { status: 400 });
  }
}
