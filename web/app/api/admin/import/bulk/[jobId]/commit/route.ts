import { NextRequest } from "next/server";
import { BulkImportStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { getBunnyStorageConfig } from "@/lib/server/bunny-config";
import { uploadImageToBunny } from "@/lib/server/bunny-storage";
import { allocateUniqueProductSlug } from "@/lib/server/product-slug";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { listZipImages } from "@/lib/bulk-import/zip-manifest";
import { mimeFromImagePath } from "@/lib/bulk-import/mime";
import { bulkImportStableRowId } from "@/lib/bulk-import/bulk-import-row-id";
import type { BulkPreviewResult, BulkPreviewRow } from "@/lib/bulk-import/build-preview";
import { effectiveProductTitle, normalizeProductNameForDb } from "@/lib/bulk-import/semantic-map";
import { isTintesCategory } from "@/lib/bulk-import/tintes";
import { normalizeTintCatalogName } from "@/lib/bulk-import/tint-catalog";
import { normalizeTaxonomyNameForDb } from "@/lib/bulk-import/category-resolve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: { jobId: string } };

const commitSchema = z
  .object({
    rowIds: z.array(z.string().min(1)).optional(),
    rowIndexes: z.array(z.number().int().min(0)).optional(),
    existingPolicy: z.enum(["skip", "replace"]).optional().default("skip"),
  })
  .refine((v) => (v.rowIds?.length ?? 0) > 0 || (v.rowIndexes?.length ?? 0) > 0, {
    message: "Selecciona al menos una fila",
  });

/** «Producto ya registrado» se gestiona en el bucle (omitir o reemplazar), no aquí. */
const BLOCKING_FILTER = (x: string) =>
  x !== "Sin imagen en ZIP para este código" &&
  x !== "Sin imagen en ZIP para este nivel" &&
  x !== "Producto ya registrado" &&
  !x.startsWith("Familia sin resolver") &&
  !x.startsWith("Tipo sin resolver");

function parsePreview(raw: unknown): BulkPreviewResult | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as BulkPreviewResult;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  if (!getBunnyStorageConfig()) {
    return noStoreJson(
      { error: "Bunny Storage no configurado. Revisa BUNNY_* en .env.local." },
      { status: 503 }
    );
  }

  const { jobId } = params;
  const job = await prisma.bulkImportJob.findUnique({ where: { id: jobId } });
  if (!job) return noStoreJson({ error: "Job no encontrado" }, { status: 404 });
  if (job.status !== BulkImportStatus.PREVIEW) {
    return noStoreJson({ error: "El job no estÃ¡ listo para importar" }, { status: 409 });
  }
  if (job.expiresAt.getTime() < Date.now()) {
    await prisma.bulkImportJob.delete({ where: { id: jobId } }).catch(() => {});
    return noStoreJson({ error: "La sesiÃ³n de importaciÃ³n expirÃ³" }, { status: 410 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = commitSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "PeticiÃ³n invÃ¡lida";
    return noStoreJson({ error: msg }, { status: 400 });
  }

  const preview = parsePreview(job.previewPayload);
  if (!preview?.rows?.length) {
    return noStoreJson({ error: "Preview no disponible" }, { status: 500 });
  }

  if (preview.tintSelectionResolved === false) {
    return noStoreJson(
      { error: "Selecciona y confirma el tipo y la familia de tinte a importar antes de continuar" },
      { status: 400 }
    );
  }

  const idSet = new Set(parsed.data.rowIds ?? []);
  const indexSet = new Set(parsed.data.rowIndexes ?? []);
  const existingPolicy = parsed.data.existingPolicy ?? "skip";
  const sourceRows = preview.matchedRows?.length ? preview.matchedRows : preview.rows;
  const toImport: BulkPreviewRow[] = [];
  const seenRefInSelection = new Set<string>();
  for (const row of sourceRows) {
    const chosen =
      idSet.size > 0 ? idSet.has(bulkImportStableRowId(row)) : indexSet.has(row.rowIndex);
    if (!chosen) continue;
    const blocking = row.issues.filter((x) => BLOCKING_FILTER(x));
    if (blocking.length > 0) {
      return noStoreJson(
        { error: `Fila ${row.rowIndex + 1}: ${blocking.join("; ")}` },
        { status: 400 }
      );
    }
    const title = effectiveProductTitle(row.mapped);
    if (!row.normalizedCode || !title || row.mapped.price == null || !row.mapped.categorySlug || !row.mapped.subcategoryName) {
      return noStoreJson({ error: `Fila ${row.rowIndex + 1}: datos incompletos` }, { status: 400 });
    }
    const ref = row.normalizedCode;
    if (seenRefInSelection.has(ref)) {
      return noStoreJson(
        {
          error: `El código «${ref}» aparece en más de una fila seleccionada. Solo puede haber una fila por código de referencia.`,
        },
        { status: 400 }
      );
    }
    seenRefInSelection.add(ref);
    toImport.push(row);
  }

  if (toImport.length === 0) {
    return noStoreJson({ error: "Ninguna fila vÃ¡lida para importar" }, { status: 400 });
  }

  const refsBatch = toImport.map((r) => r.normalizedCode!);
  const existingAtCommit = await prisma.product.findMany({
    where: { externalRef: { in: refsBatch } },
    select: { id: true, name: true, externalRef: true },
  });
  const clashByRef = new Map(existingAtCommit.map((p) => [p.externalRef!, p] as const));

  await prisma.bulkImportJob.update({
    where: { id: jobId },
    data: { status: BulkImportStatus.IMPORTING, errorMessage: null },
  });

  const { byFileName } = listZipImages(Buffer.from(job.zipBlob));
  const createdProducts: ReturnType<typeof prismaProductToAdmin>[] = [];
  const errors: string[] = [];
  let skippedExistingDuplicates = 0;

  try {
    for (const row of toImport) {
      const ref = row.normalizedCode!;
      try {
        const clash = clashByRef.get(ref) ?? null;
        if (clash) {
          if (existingPolicy === "skip") {
            skippedExistingDuplicates += 1;
            continue;
          }
        }

        const matchFiles = (row.imageMatches ?? [])
          .filter(
            (m) =>
              m.matchedBy === "exact" ||
              m.matchedBy === "numericPrefix" ||
              m.matchedBy === "sixDigitPrefix" ||
              m.matchedBy === "tintLevel"
          )
          .map((m) => m.imageFilename);
        const uniqueFiles = Array.from(new Set(matchFiles));
        const imgs = uniqueFiles
          .map((f) => byFileName.get(f))
          .filter((x): x is NonNullable<typeof x> => !!x);
        let mainUrl: string | null = null;
        const galleryUrls: string[] = [];
        for (const img of imgs) {
          const mime = mimeFromImagePath(img.entryName);
          const { publicUrl } = await uploadImageToBunny(img.buffer, mime);
          if (!mainUrl) mainUrl = publicUrl;
          else galleryUrls.push(publicUrl);
        }

        const name = normalizeProductNameForDb(effectiveProductTitle(row.mapped)!);
        const slug = await allocateUniqueProductSlug(name);
        /** Descripción del CSV tal cual; fallback genérico si no hay columna mapeada. */
        const description =
          row.mapped.description?.trim() || `Producto: ${name}`;
        const brand = row.mapped.brand?.trim() || "GinnaBeauty";
        const tags = (row.mapped.tags ?? []).map((t) => t.trim()).filter(Boolean);
        const applyTags = preview.csvHasTagsColumn === true;

        let tintFamilyId: string | null = null;
        let tintTypeId: string | null = null;
        let tintLevel: string | null = null;
        let tintGroup: string | null = null;

        if (isTintesCategory(row.mapped.categorySlug)) {
          tintLevel = row.mapped.tintLevel?.trim() || null;
          tintGroup = row.mapped.tintGroup?.trim() || null;
          tintTypeId = preview.activeTintTypeId ?? row.tintTypeId ?? null;
          tintFamilyId = preview.activeTintFamilyId ?? row.tintFamilyId ?? null;

          if (row.mapped.tintType?.trim() && !tintTypeId) {
            errors.push(`Fila ${row.rowIndex + 1} (${ref}): Tipo sin resolver`);
            continue;
          }

          if (row.mapped.tintFamily?.trim() && !tintFamilyId) {
            const famName = normalizeTintCatalogName(row.mapped.tintFamily);
            const fam = await prisma.tintFamily.upsert({
              where: { name: famName },
              create: { name: famName },
              update: {},
            });
            tintFamilyId = fam.id;
          }
        }

        const tintData = isTintesCategory(row.mapped.categorySlug)
          ? { tintFamilyId, tintTypeId, tintLevel, tintGroup }
          : {};

        const productRow = clash
          ? await prisma.product.update({
              where: { id: clash.id },
              data: {
                name,
                brand,
                category: row.mapped.categorySlug!,
                subcategory: normalizeTaxonomyNameForDb(row.mapped.subcategoryName!),
                description,
                price: row.mapped.price!,
                originalPrice: row.mapped.originalPrice ?? null,
                stock: row.mapped.stock ?? 0,
                ...(applyTags ? { tags } : {}),
                ...tintData,
                imageUrl: mainUrl,
                active: true,
                images: {
                  deleteMany: {},
                  ...(galleryUrls.length > 0 && {
                    create: galleryUrls.map((url, i) => ({ url, sortOrder: i })),
                  }),
                },
              },
              include: { images: true },
            })
          : await prisma.product.create({
              data: {
                slug,
                name,
                brand,
                category: row.mapped.categorySlug!,
                subcategory: normalizeTaxonomyNameForDb(row.mapped.subcategoryName!),
                description,
                price: row.mapped.price!,
                originalPrice: row.mapped.originalPrice ?? null,
                stock: row.mapped.stock ?? 0,
                tags: applyTags ? tags : [],
                rating: 5,
                reviews: 0,
                badge: null,
                emoji: "📦",
                imageUrl: mainUrl,
                externalRef: ref,
                isNew: false,
                featuredInHome: false,
                active: true,
                ...tintData,
                ...(galleryUrls.length > 0 && {
                  images: {
                    create: galleryUrls.map((url, i) => ({ url, sortOrder: i })),
                  },
                }),
              },
              include: { images: true },
            });
        createdProducts.push(prismaProductToAdmin(productRow));
        if (!clash) {
          clashByRef.set(ref, { id: productRow.id, name: productRow.name, externalRef: ref });
        }
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (code === "P2002") {
          errors.push(
            `Fila ${row.rowIndex + 1} (${ref}): el código ya está registrado (referencia duplicada).`
          );
          continue;
        }
        const msg = e instanceof Error ? e.message : "Error desconocido";
        errors.push(`Fila ${row.rowIndex + 1} (${ref}): ${msg}`);
      }
    }

    const finalStats = {
      imported: createdProducts.length,
      failed: errors.length,
      skippedExistingDuplicates,
      errors,
    };

    /** Tras commit: no conservar CSV/ZIP ni preview completo en DB (solo resumen para diagnÃ³stico). */
    const minimalPayload = {
      purgedAt: new Date().toISOString(),
      commitSummary: {
        imported: finalStats.imported,
        failed: finalStats.failed,
        errors: finalStats.errors.slice(0, 80),
      },
    };

    await prisma.bulkImportJob.update({
      where: { id: jobId },
      data: {
        status: errors.length > 0 && createdProducts.length === 0 ? BulkImportStatus.FAILED : BulkImportStatus.COMPLETED,
        errorMessage: errors.length ? errors.join("\n") : null,
        zipBlob: Buffer.alloc(0),
        headers: [],
        rows: [],
        stats: finalStats as unknown as object,
        previewPayload: minimalPayload as unknown as object,
      },
    });

    return noStoreJson({
      ok: true,
      imported: createdProducts.length,
      failed: errors.length,
      errors,
      products: createdProducts,
      skippedExistingDuplicates,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error en importaciÃ³n";
    await prisma.bulkImportJob.update({
      where: { id: jobId },
      data: {
        status: BulkImportStatus.FAILED,
        errorMessage: msg,
        zipBlob: Buffer.alloc(0),
        headers: [],
        rows: [],
        previewPayload: {
          purgedAt: new Date().toISOString(),
          failure: true,
          message: msg.slice(0, 500),
        } as unknown as object,
      },
    });
    console.error("[POST commit bulk]", e);
    return noStoreJson({ error: msg }, { status: 500 });
  }
}

