import { NextRequest } from "next/server";
import { noStoreJson } from "@/lib/server/no-store-json";
import { prisma } from "@/lib/prisma";
import { getBunnyStorageConfig } from "@/lib/server/bunny-config";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { uploadImageToBunny } from "@/lib/server/bunny-storage";
import { optimizeImageToWebp } from "@/lib/server/optimize-image";

async function saveStoredImage(bytes: Buffer, contentType: string) {
  const write = () =>
    prisma.storedImage.create({
      data: { contentType, bytes: new Uint8Array(bytes) },
      select: { id: true },
    });
  try {
    return await write();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (!/StoredImage|does not exist|P2021/i.test(msg)) throw err;
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StoredImage" (
        "id" TEXT NOT NULL,
        "contentType" TEXT NOT NULL,
        "bytes" BYTEA NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "StoredImage_pkey" PRIMARY KEY ("id")
      )
    `);
    return write();
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"]);
/** Entrada más holgada: se comprime a WebP antes de guardar. */
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return noStoreJson({ error: "Falta el campo file" }, { status: 400 });
    }

    const contentType = (file.type || "application/octet-stream").toLowerCase();
    if (!ALLOWED.has(contentType) && contentType !== "application/octet-stream") {
      return noStoreJson({ error: `Tipo de imagen no permitido: ${contentType}` }, { status: 400 });
    }
    const raw = Buffer.from(await file.arrayBuffer());
    if (raw.length > MAX_INPUT_BYTES) {
      return noStoreJson({ error: "Imagen demasiado grande (máx. 12 MB)" }, { status: 400 });
    }
    if (raw.length < 32) {
      return noStoreJson({ error: "Archivo de imagen vacío o inválido" }, { status: 400 });
    }

    let buffer: Buffer;
    let outType: string;
    let beforeBytes = raw.length;
    let afterBytes = raw.length;
    let optimized = false;
    let width = 0;
    let height = 0;

    try {
      const result = await optimizeImageToWebp(raw);
      buffer = result.buffer;
      outType = result.contentType;
      beforeBytes = result.beforeBytes;
      afterBytes = result.afterBytes;
      optimized = result.optimized;
      width = result.width;
      height = result.height;
    } catch (optErr) {
      console.warn("[POST /api/admin/upload] optimize fallback", optErr);
      if (!ALLOWED.has(contentType)) {
        return noStoreJson({ error: "No se pudo procesar la imagen" }, { status: 400 });
      }
      buffer = raw;
      outType = contentType === "image/jpg" ? "image/jpeg" : contentType;
    }

    if (getBunnyStorageConfig()) {
      try {
        const folder = outType === "image/webp" ? "uploads/webp" : "uploads";
        const { publicUrl } = await uploadImageToBunny(buffer, outType, folder);
        return noStoreJson({
          url: publicUrl,
          optimized,
          contentType: outType,
          beforeBytes,
          afterBytes,
          width,
          height,
        });
      } catch (err) {
        const bunnyMsg = err instanceof Error ? err.message : "";
        if (bunnyMsg !== "BUNNY_UNAUTHORIZED") throw err;
      }
    }

    const stored = await saveStoredImage(buffer, outType);
    return noStoreJson({
      url: `/api/media/stored/${stored.id}`,
      optimized,
      contentType: outType,
      beforeBytes,
      afterBytes,
      width,
      height,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al subir imagen";
    console.error("[POST /api/admin/upload]", e);
    return noStoreJson({ error: msg }, { status: 400 });
  }
}
