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
import {
  bulkRowBlockingIssues,
  bulkRowIsReadyForVariantGroupAssign,
  bulkRowIsVariantGroupAssign,
} from "@/lib/bulk-import/variant-group-assign";
import type { BulkPreviewResult, BulkPreviewRow } from "@/lib/bulk-import/build-preview";
import { effectiveProductTitle, normalizeProductNameForDb } from "@/lib/bulk-import/semantic-map";
import { isTintesCategory, effectiveTintFamily, bulkPreviewRowIsTintes } from "@/lib/bulk-import/tintes";
import { normalizeTintCatalogName } from "@/lib/bulk-import/tint-catalog";
import { normalizeTaxonomyNameForDb } from "@/lib/bulk-import/category-resolve";
import { canonicalExternalRef, canonicalVariantGroupCode } from "@/lib/bulk-import/variant-group-code";
import { normalizeColorHex } from "@/lib/product-color";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";
import {
  deleteBulkImportZip,
  resolveBulkImportZipBuffer,
} from "@/lib/server/bulk-import-zip-store";
import {
  CatalogActions,
  CatalogEntities,
  loadProductSnapshot,
  snapshotProduct,
  type CatalogChangeInput,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

type Ctx = { params: { jobId: string } };

const commitSchema = z
  .object({
    rowIds: z.array(z.string().min(1)).optional(),
    rowIndexes: z.array(z.number().int().min(0)).optional(),
    existingPolicy: z.enum(["skip", "replace", "omit"]).optional().default("skip"),
  })
  .refine((v) => (v.rowIds?.length ?? 0) > 0 || (v.rowIndexes?.length ?? 0) > 0, {
    message: "Selecciona al menos una fila",
  });

function variantGroupFieldsFromRow(row: BulkPreviewRow): {
  variantGroupCode: string | null;
  variantGroupOrder: number | null;
} {
  const variantGroupCode = canonicalVariantGroupCode(row.mapped.variantGroupCode);
  const variantGroupOrder =
    variantGroupCode != null && row.variantGroupOrder != null ? row.variantGroupOrder : null;
  return { variantGroupCode, variantGroupOrder };
}

function colorFieldsFromRow(row: BulkPreviewRow): {
  colorHex: string | null;
  colorName: string | null;
} {
  return {
    colorHex: normalizeColorHex(row.mapped.colorHex),
    colorName: row.mapped.colorName?.trim() || null,
  };
}

type ExistingProductHit = { id: string; name: string; externalRef: string | null };

function buildExistingProductLookups(
  products: ExistingProductHit[],
  refsBatch: Set<string>,
  existingIds: Set<string>
): {
  clashByRef: Map<string, ExistingProductHit>;
  clashById: Map<string, ExistingProductHit>;
} {
  const clashByRef = new Map<string, ExistingProductHit>();
  const clashById = new Map<string, ExistingProductHit>();
  for (const p of products) {
    clashById.set(p.id, p);
    const refKey = canonicalExternalRef(p.externalRef);
    if (refKey && refsBatch.has(refKey)) {
      clashByRef.set(refKey, p);
    }
    if (existingIds.has(p.id) && refKey) {
      clashByRef.set(refKey, p);
    }
  }
  return { clashByRef, clashById };
}

function resolveExistingProductForRow(
  row: BulkPreviewRow,
  clashByRef: Map<string, ExistingProductHit>,
  clashById: Map<string, ExistingProductHit>
): ExistingProductHit | null {
  if (row.existingProductId) {
    const byId = clashById.get(row.existingProductId);
    if (byId) return byId;
  }
  const ref = row.normalizedCode;
  if (!ref) return null;
  return clashByRef.get(ref) ?? null;
}

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

  const existingPolicy = parsed.data.existingPolicy ?? "skip";

  if (preview.tintSelectionResolved === false) {
    const idSetEarly = new Set(parsed.data.rowIds ?? []);
    const indexSetEarly = new Set(parsed.data.rowIndexes ?? []);
    const chosenRows = preview.rows.filter((row) =>
      idSetEarly.size > 0
        ? idSetEarly.has(bulkImportStableRowId(row))
        : indexSetEarly.has(row.rowIndex)
    );
    const needsTintForSelection = chosenRows.some(
      (row) => bulkPreviewRowIsTintes(row) && !bulkRowIsVariantGroupAssign(row, existingPolicy)
    );
    if (needsTintForSelection) {
      return noStoreJson(
        { error: "Selecciona y confirma el tipo y la familia de tinte a importar antes de continuar" },
        { status: 400 }
      );
    }
  }

  const idSet = new Set(parsed.data.rowIds ?? []);
  const indexSet = new Set(parsed.data.rowIndexes ?? []);
  /** Todas las filas del CSV (necesario para grupos de barras y filas ya registradas). */
  const sourceRows = preview.rows;
  const toImport: BulkPreviewRow[] = [];
  const seenRefInSelection = new Set<string>();
  for (const row of sourceRows) {
    const chosen =
      idSet.size > 0 ? idSet.has(bulkImportStableRowId(row)) : indexSet.has(row.rowIndex);
    if (!chosen) continue;
    const isVariantAssign = bulkRowIsVariantGroupAssign(row, existingPolicy);
    const blocking = bulkRowBlockingIssues(row, existingPolicy);
    if (blocking.length > 0) {
      return noStoreJson(
        { error: `Fila ${row.rowIndex + 1}: ${blocking.join("; ")}` },
        { status: 400 }
      );
    }
    const title = effectiveProductTitle(row.mapped);
    const isExistingVariantGroupAssign = isVariantAssign;

    if (!row.normalizedCode) {
      return noStoreJson({ error: `Fila ${row.rowIndex + 1}: código vacío` }, { status: 400 });
    }
    if (
      !isExistingVariantGroupAssign &&
      (!title || row.mapped.price == null || !row.mapped.categorySlug || !row.mapped.subcategoryName)
    ) {
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

  const refsBatch = new Set(toImport.map((r) => r.normalizedCode!).filter(Boolean));
  const existingIds = new Set(
    toImport.map((r) => r.existingProductId).filter((id): id is string => !!id)
  );
  const existingAtCommit = await prisma.product.findMany({
    where: {
      OR: [
        { externalRef: { not: null } },
        ...(existingIds.size > 0 ? [{ id: { in: Array.from(existingIds) } }] : []),
      ],
    },
    select: { id: true, name: true, externalRef: true },
  });
  const { clashByRef, clashById } = buildExistingProductLookups(
    existingAtCommit,
    refsBatch,
    existingIds
  );

  await prisma.bulkImportJob.update({
    where: { id: jobId },
    data: { status: BulkImportStatus.IMPORTING, errorMessage: null },
  });

  let zipBuffer: Buffer;
  try {
    zipBuffer = await resolveBulkImportZipBuffer(jobId, job.zipBlob);
  } catch (e) {
    await prisma.bulkImportJob.update({
      where: { id: jobId },
      data: { status: BulkImportStatus.PREVIEW, errorMessage: "ZIP no disponible" },
    });
    const msg = e instanceof Error ? e.message : "ZIP no disponible";
    return noStoreJson({ error: msg }, { status: 409 });
  }

  const { byFileName } = listZipImages(zipBuffer, { includeBuffers: true });
  const createdProducts: ReturnType<typeof prismaProductToAdmin>[] = [];
  const errors: string[] = [];
  let skippedExistingDuplicates = 0;
  let variantGroupsAssigned = 0;
  const assignedGroupCodes = new Set<string>();
  const versionChanges: CatalogChangeInput[] = [];
  let versionCreatedCount = 0;
  let versionUpdatedCount = 0;

  try {
    for (const row of toImport) {
      const ref = row.normalizedCode!;
      try {
        const clash = resolveExistingProductForRow(row, clashByRef, clashById);
        const { variantGroupCode, variantGroupOrder } = variantGroupFieldsFromRow(row);
        const { colorHex, colorName } = colorFieldsFromRow(row);

        if (clash && existingPolicy === "omit") {
          skippedExistingDuplicates += 1;
          continue;
        }

        if (clash && existingPolicy === "skip") {
          const hasVariantGroup = !!variantGroupCode;
          const hasColor = !!colorHex;
          if (hasVariantGroup || hasColor) {
            const beforeSnap = await loadProductSnapshot(clash.id);
            const productRow = await prisma.product.update({
              where: { id: clash.id },
              data: {
                ...(hasVariantGroup ? { variantGroupCode, variantGroupOrder } : {}),
                ...(hasColor ? { colorHex, colorName } : {}),
              },
              include: { images: true },
            });
            createdProducts.push(prismaProductToAdmin(productRow));
            versionChanges.push({
              entityType: CatalogEntities.PRODUCT,
              entityId: productRow.id,
              action: CatalogActions.UPDATE,
              label: `Producto: ${productRow.name}`,
              beforeData: beforeSnap,
              afterData: snapshotProduct(productRow),
            });
            versionUpdatedCount += 1;
            if (hasVariantGroup) {
              variantGroupsAssigned += 1;
              assignedGroupCodes.add(variantGroupCode!);
            }
          } else {
            skippedExistingDuplicates += 1;
          }
          continue;
        }

        const matchFiles = (row.imageMatches ?? [])
          .filter(
            (m) =>
              m.matchedBy === "exact" ||
              m.matchedBy === "numericPrefix" ||
              m.matchedBy === "sixDigitPrefix" ||
              m.matchedBy === "tintLevel" ||
              m.matchedBy === "fuzzy"
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

          if (!tintFamilyId) {
            const familyRaw = effectiveTintFamily(row.mapped);
            if (familyRaw) {
              const famName = normalizeTintCatalogName(familyRaw);
              const fam = await prisma.tintFamily.upsert({
                where: { name: famName },
                create: { name: famName },
                update: {},
              });
              tintFamilyId = fam.id;
            }
          }
        }

        const tintData = isTintesCategory(row.mapped.categorySlug)
          ? { tintFamilyId, tintTypeId, tintLevel, tintGroup }
          : {};

        const beforeSnap = clash ? await loadProductSnapshot(clash.id) : null;

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
                variantGroupCode,
                variantGroupOrder,
                colorHex,
                colorName,
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
                variantGroupCode,
                variantGroupOrder,
                colorHex,
                colorName,
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
        if (clash) {
          versionChanges.push({
            entityType: CatalogEntities.PRODUCT,
            entityId: productRow.id,
            action: CatalogActions.UPDATE,
            label: `Producto: ${productRow.name}`,
            beforeData: beforeSnap,
            afterData: snapshotProduct(productRow),
          });
          versionUpdatedCount += 1;
        } else {
          versionChanges.push({
            entityType: CatalogEntities.PRODUCT,
            entityId: productRow.id,
            action: CatalogActions.CREATE,
            label: `Producto: ${productRow.name}`,
            beforeData: null,
            afterData: snapshotProduct(productRow),
          });
          versionCreatedCount += 1;
        }
        if (!clash) {
          const refKey = canonicalExternalRef(ref);
          if (refKey) {
            clashByRef.set(refKey, { id: productRow.id, name: productRow.name, externalRef: ref });
            clashById.set(productRow.id, { id: productRow.id, name: productRow.name, externalRef: ref });
          }
        }
        if (variantGroupCode) assignedGroupCodes.add(variantGroupCode);
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

    let variantGroupsWithMultipleMembers = 0;
    let variantGroupsSingleton = 0;
    if (assignedGroupCodes.size > 0) {
      const groupStats = await prisma.product.groupBy({
        by: ["variantGroupCode"],
        _count: { id: true },
        where: { variantGroupCode: { in: Array.from(assignedGroupCodes) } },
      });
      variantGroupsWithMultipleMembers = groupStats.filter((g) => g._count.id >= 2).length;
      variantGroupsSingleton = groupStats.filter((g) => g._count.id === 1).length;
    }

    if (variantGroupsAssigned > 0 || createdProducts.length > 0) {
      revalidateStorefrontProducts();
    }

    if (versionChanges.length > 0) {
      const labelParts: string[] = [];
      if (versionCreatedCount > 0) labelParts.push(`${versionCreatedCount} nuevos`);
      if (versionUpdatedCount > 0) labelParts.push(`${versionUpdatedCount} actualizados`);
      await recordCatalogVersionSafe({
        label: `Importación masiva: ${labelParts.join(", ") || `${versionChanges.length} cambios`}`,
        changes: versionChanges,
      });
    }

    const finalStats = {
      imported: createdProducts.length,
      failed: errors.length,
      skippedExistingDuplicates,
      variantGroupsAssigned,
      variantGroupsWithMultipleMembers,
      variantGroupsSingleton,
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
    await deleteBulkImportZip(jobId);

    return noStoreJson({
      ok: true,
      imported: createdProducts.length,
      failed: errors.length,
      errors,
      products: createdProducts,
      skippedExistingDuplicates,
      variantGroupsAssigned,
      variantGroupsWithMultipleMembers,
      variantGroupsSingleton,
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
    await deleteBulkImportZip(jobId);
    console.error("[POST commit bulk]", e);
    return noStoreJson({ error: msg }, { status: 500 });
  }
}

