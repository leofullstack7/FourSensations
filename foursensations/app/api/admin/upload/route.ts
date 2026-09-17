import { NextRequest, NextResponse } from "next/server";
import { noStoreJson } from "@/lib/server/no-store-json";
import { getBunnyStorageConfig } from "@/lib/server/bunny-config";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { uploadImageToBunny } from "@/lib/server/bunny-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  if (!getBunnyStorageConfig()) {
    return noStoreJson(
      { error: "Bunny Storage no configurado. Revisa BUNNY_* en .env.local." },
      { status: 503 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return noStoreJson({ error: "Falta el campo file" }, { status: 400 });
    }

    const contentType = file.type || "application/octet-stream";
    const buf = Buffer.from(await file.arrayBuffer());

    const { publicUrl } = await uploadImageToBunny(buf, contentType);
    return noStoreJson({ url: publicUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al subir imagen";
    console.error("[POST /api/admin/upload]", e);
    return noStoreJson({ error: msg }, { status: 400 });
  }
}
