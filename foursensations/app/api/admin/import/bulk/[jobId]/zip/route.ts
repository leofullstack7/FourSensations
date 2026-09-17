import { NextRequest } from "next/server";
import { BulkImportStatus } from "@prisma/client";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { saveBulkImportZip } from "@/lib/server/bulk-import-zip-store";
import { BULK_ZIP_MAX_BYTES } from "@/lib/bulk-import/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

type Ctx = { params: { jobId: string } };

/** Sube el ZIP de imágenes después del analyze (no bloquea el match CSV↔nombres). */
export async function POST(req: NextRequest, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { jobId } = params;
  const job = await withPrismaRetry(() => prisma.bulkImportJob.findUnique({ where: { id: jobId } }));
  if (!job) return noStoreJson({ error: "Job no encontrado" }, { status: 404 });
  if (job.expiresAt.getTime() < Date.now()) {
    return noStoreJson({ error: "La sesión de importación expiró" }, { status: 410 });
  }
  if (job.status !== BulkImportStatus.PREVIEW && job.status !== BulkImportStatus.IMPORTING) {
    return noStoreJson({ error: "El job no admite ZIP en este estado" }, { status: 409 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return noStoreJson({ error: "FormData inválido" }, { status: 400 });
  }
  const zipFile = form.get("zip");
  if (!(zipFile instanceof Blob) || zipFile.size <= 0) {
    return noStoreJson({ error: "Falta archivo ZIP (campo zip)" }, { status: 400 });
  }
  if (zipFile.size > BULK_ZIP_MAX_BYTES) {
    return noStoreJson(
      { error: `ZIP demasiado grande (máx. ${BULK_ZIP_MAX_BYTES / (1024 * 1024)} MB). Optimiza a WebP antes de subir.` },
      { status: 400 },
    );
  }

  const zipBuf = Buffer.from(await zipFile.arrayBuffer());
  await saveBulkImportZip(jobId, zipBuf);

  const prevStats = (job.stats && typeof job.stats === "object" ? job.stats : {}) as Record<string, unknown>;
  await withPrismaRetry(() =>
    prisma.bulkImportJob.update({
      where: { id: jobId },
      data: {
        stats: { ...prevStats, zipStoredExternally: true, zipBytes: zipBuf.length } as object,
      },
    }),
  );

  return noStoreJson({ ok: true, jobId, zipBytes: zipBuf.length });
}
