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
import type { BulkPreviewResult, BulkPreviewRow } from "@/lib/bulk-import/build-preview";

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

const BLOCKING_FILTER = (x: string, existingPolicy: "skip" | "replace") =>
  x !== "Sin imagen en ZIP para este código" &&
  !(x === "Producto ya registrado" && existingPolicy === "replace");

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

  const idSet = new Set(parsed.data.rowIds ?? []);
  const indexSet = new Set(parsed.data.rowIndexes ?? []);
  const existingPolicy = parsed.data.existingPolicy ?? "skip";
  const toImport: BulkPreviewRow[] = [];
  for (const row of (preview.matchedRows?.length ? preview.matchedRows : preview.rows)) {
    const chosen =
      idSet.size > 0 ? idSet.has(row.previewRowId ?? row.rowId) : indexSet.has(row.rowIndex);
    if (!chosen) continue;
    const blocking = row.issues.filter((x) => BLOCKING_FILTER(x, existingPolicy));
    if (blocking.length > 0) {
      return noStoreJson(
        { error: `Fila ${row.rowIndex + 1}: ${blocking.join("; ")}` },
        { status: 400 }
      );
    }
    if (!row.normalizedCode || !row.mapped.name || row.mapped.price == null || !row.mapped.categorySlug || !row.mapped.subcategoryName) {
      return noStoreJson({ error: `Fila ${row.rowIndex + 1}: datos incompletos` }, { status: 400 });
    }
    toImport.push(row);
  }

  if (toImport.length === 0) {
    return noStoreJson({ error: "Ninguna fila vÃ¡lida para importar" }, { status: 400 });
  }

  await prisma.bulkImportJob.update({
    where: { id: jobId },
    data: { status: BulkImportStatus.IMPORTING, errorMessage: null },
  });

  const { byFileName } = listZipImages(Buffer.from(job.zipBlob));
  const createdProducts: ReturnType<typeof prismaProductToAdmin>[] = [];
  const errors: string[] = [];

  try {
    for (const row of toImport) {
      const ref = row.normalizedCode!;
      try {
        const clash = await prisma.product.findUnique({ where: { externalRef: ref } });
        if (clash) {
          if (existingPolicy === "skip") {
            continue;
          }
        }

        const matchFiles = (row.imageMatches ?? [])
          .filter(
            (m) =>
              m.matchedBy === "exact" ||
              m.matchedBy === "numericPrefix" ||
              m.matchedBy === "sixDigitPrefix"
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

        const name = row.mapped.name!.trim();
        const slug = await allocateUniqueProductSlug(name);
        const description =
          row.mapped.description?.trim() || `Producto: ${name}`;
        const brand = row.mapped.brand?.trim() || "GinnaBeauty";

        const productRow = clash
          ? await prisma.product.update({
              where: { id: clash.id },
              data: {
                name,
                brand,
                category: row.mapped.categorySlug!,
                subcategory: row.mapped.subcategoryName!,
                description,
                price: row.mapped.price!,
                originalPrice: row.mapped.originalPrice ?? null,
                stock: row.mapped.stock ?? 0,
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
                subcategory: row.mapped.subcategoryName!,
                description,
                price: row.mapped.price!,
                originalPrice: row.mapped.originalPrice ?? null,
                stock: row.mapped.stock ?? 0,
                rating: 5,
                reviews: 0,
                badge: null,
                emoji: "📦",
                imageUrl: mainUrl,
                externalRef: ref,
                isNew: false,
                featuredInHome: false,
                active: true,
                ...(galleryUrls.length > 0 && {
                  images: {
                    create: galleryUrls.map((url, i) => ({ url, sortOrder: i })),
                  },
                }),
              },
              include: { images: true },
            });
        createdProducts.push(prismaProductToAdmin(productRow));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error desconocido";
        errors.push(`Fila ${row.rowIndex + 1} (${ref}): ${msg}`);
      }
    }

    const finalStats = {
      imported: createdProducts.length,
      failed: errors.length,
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

