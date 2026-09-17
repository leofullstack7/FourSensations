import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { BulkImportStatus } from "@prisma/client";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { fetchCategoryTreeForImport } from "@/lib/server/admin-category-tree";
import { decodeCsvBuffer, parseCsv, pickCodeColumnIndex } from "@/lib/bulk-import/csv";
import {
  listZipImagesAsync,
  listZipImagesFromManifest,
  type ZipImageEntry,
  type ZipManifestItem,
} from "@/lib/bulk-import/zip-manifest";
import { buildBulkPreview } from "@/lib/bulk-import/build-preview";
import { applyTintCatalogToPreview } from "@/lib/bulk-import/tint-catalog";
import { fetchTintCatalogFromDb } from "@/lib/server/tint-catalog-db";
import { markBulkPreviewExistingByExternalRef } from "@/lib/server/bulk-import-mark-existing";
import { saveBulkImportZip } from "@/lib/server/bulk-import-zip-store";
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
/** Render: el analyze ya no espera el ZIP completo. */
export const maxDuration = 60;

function parseZipManifest(raw: FormDataEntryValue | null): ZipManifestItem[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ZipManifestItem[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        const name = item.trim();
        if (name) out.push({ entryName: name, fileName: name });
        continue;
      }
      if (item && typeof item === "object") {
        const rec = item as { entryName?: unknown; fileName?: unknown; path?: unknown };
        const entryName = String(rec.entryName || rec.path || rec.fileName || "").trim();
        const fileName = String(rec.fileName || entryName).trim();
        if (entryName) out.push({ entryName, fileName });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const form = await req.formData();
    const csvFile = form.get("csv");
    const zipFile = form.get("zip");
    const modeRaw = String(form.get("mode") ?? "new").toLowerCase();
    const isUpdateMode = modeRaw === "update";
    const manifestItems = parseZipManifest(form.get("zipManifest"));

    if (!(csvFile instanceof Blob)) {
      return noStoreJson({ error: "Falta archivo CSV (campo csv)" }, { status: 400 });
    }
    const hasZipFile = zipFile instanceof Blob && zipFile.size > 0;
    if (!isUpdateMode && !hasZipFile && manifestItems.length === 0) {
      return noStoreJson({ error: "Falta archivo ZIP o manifiesto de imágenes" }, { status: 400 });
    }

    if (csvFile.size > BULK_CSV_MAX_BYTES) {
      return noStoreJson({ error: `CSV demasiado grande (máx. ${BULK_CSV_MAX_BYTES / (1024 * 1024)} MB)` }, { status: 400 });
    }
    if (hasZipFile && zipFile.size > BULK_ZIP_MAX_BYTES) {
      return noStoreJson({ error: `ZIP demasiado grande (máx. ${BULK_ZIP_MAX_BYTES / (1024 * 1024)} MB)` }, { status: 400 });
    }

    const csvBuf = Buffer.from(await csvFile.arrayBuffer());
    const csvText = decodeCsvBuffer(csvBuf);

    const { delimiter, headers, rows } = parseCsv(csvText);
    if (rows.length === 0) {
      return noStoreJson({ error: "El CSV no tiene filas de datos" }, { status: 400 });
    }
    if (rows.length > BULK_MAX_ROWS) {
      return noStoreJson({ error: `Demasiadas filas (máx. ${BULK_MAX_ROWS})` }, { status: 400 });
    }

    let entries: ZipImageEntry[] = listZipImagesFromManifest(manifestItems);
    let zipBuf: Buffer | null = null;
    if (hasZipFile) {
      zipBuf = Buffer.from(await zipFile.arrayBuffer());
      try {
        const listed = await listZipImagesAsync(zipBuf, { includeBuffers: false });
        if (listed.entries.length > 0) entries = listed.entries;
      } catch (zipErr) {
        console.warn("[preview] No se pudo leer el ZIP; se usa el manifiesto.", zipErr);
        if (entries.length === 0) {
          return noStoreJson(
            { error: "No se pudo leer el ZIP. Optimízalo en el navegador e inténtalo de nuevo." },
            { status: 400 },
          );
        }
      }
    }

    if (entries.length > BULK_MAX_ZIP_IMAGES) {
      return noStoreJson({ error: `Demasiadas imágenes en el ZIP (máx. ${BULK_MAX_ZIP_IMAGES})` }, { status: 400 });
    }

    const codeColumnIndex = pickCodeColumnIndex(headers, rows);
    const categoryTree = await withPrismaRetry(() => fetchCategoryTreeForImport());

    const previewBase = buildBulkPreview({
      headers,
      dataRows: rows,
      codeColumnIndex,
      zipEntries: entries,
      categoryTree,
      defaultCategorySlug: null,
    });
    await withPrismaRetry(() => markBulkPreviewExistingByExternalRef(prisma, previewBase));

    const tintCatalog = await withPrismaRetry(() => fetchTintCatalogFromDb(prisma));
    const preview = applyTintCatalogToPreview(previewBase, {
      existingTintFamilies: tintCatalog.families,
      existingTintTypes: tintCatalog.types,
      activeTintTypeCsvKey: null,
      activeTintTypeId: null,
      activeTintFamilyCsvKey: null,
      activeTintFamilyId: null,
      tintTypeLinks: {},
      tintFamilyLinks: {},
    });

    const expiresAt = new Date(Date.now() + BULK_JOB_TTL_HOURS * 60 * 60 * 1000);
    const jobId = randomUUID();

    let zipStored = false;
    if (zipBuf && zipBuf.length > 22) {
      try {
        await saveBulkImportZip(jobId, zipBuf);
        zipStored = true;
      } catch (e) {
        console.error("[preview] ZIP no se pudo guardar; el analyze continúa.", e);
      }
    }

    const statsStored = {
      ...preview.stats,
      defaultCategorySlug: null,
      zipStoredExternally: zipStored,
      zipBytes: zipBuf?.length ?? 0,
      zipManifest: manifestItems.length
        ? manifestItems
        : entries.map((e) => ({ entryName: e.entryName, fileName: e.fileName })),
    };

    const job = await withPrismaRetry(() =>
      prisma.bulkImportJob.create({
        data: {
          id: jobId,
          expiresAt,
          status: BulkImportStatus.PREVIEW,
          selectedCodeHeader: headers[codeColumnIndex] ?? "",
          codeColumnIndex,
          csvDelimiter: delimiter,
          headers: headers as unknown as object[],
          rows: rows as unknown as object[],
          previewPayload: preview as unknown as object,
          stats: statsStored as unknown as object,
          zipBlob: Buffer.alloc(0),
        },
      })
    );

    return noStoreJson({
      jobId: job.id,
      preview,
      expiresAt: job.expiresAt.toISOString(),
      zipStored,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al analizar archivos";
    console.error("[POST /api/admin/import/bulk/preview]", e);
    return noStoreJson({ error: msg }, { status: 400 });
  }
}
