import { NextRequest } from "next/server";
import { noStoreJson } from "@/lib/server/no-store-json";
import { prisma } from "@/lib/prisma";
import { getBunnyStorageConfig } from "@/lib/server/bunny-config";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { uploadImageToBunny } from "@/lib/server/bunny-storage";

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

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return noStoreJson({ error: "Falta el campo file" }, { status: 400 });
    }

    const contentType = file.type || "application/octet-stream";
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    if (!allowed.has(contentType)) {
      return noStoreJson({ error: `Tipo de imagen no permitido: ${contentType}` }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) {
      return noStoreJson({ error: "Imagen demasiado grande (máx. 8 MB)" }, { status: 400 });
    }

    if (getBunnyStorageConfig()) {
      try {
        const { publicUrl } = await uploadImageToBunny(buf, contentType);
        return noStoreJson({ url: publicUrl });
      } catch (err) {
        const bunnyMsg = err instanceof Error ? err.message : "";
        if (bunnyMsg !== "BUNNY_UNAUTHORIZED") throw err;
      }
    }

    const stored = await saveStoredImage(buf, contentType);
    return noStoreJson({ url: `/api/media/stored/${stored.id}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al subir imagen";
    console.error("[POST /api/admin/upload]", e);
    return noStoreJson({ error: msg }, { status: 400 });
  }
}
