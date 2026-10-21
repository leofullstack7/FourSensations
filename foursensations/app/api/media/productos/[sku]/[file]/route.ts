import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolveProductPhotoFile } from "@/lib/server/product-photo-files";
import { ensureBunnyPublicUrl } from "@/lib/server/bunny-storage";

type RouteCtx = { params: { sku: string; file: string } };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REDIRECT_CACHE = "public, max-age=31536000, immutable, stale-while-revalidate=86400";
const BODY_CACHE = "public, max-age=604800, stale-while-revalidate=2592000";

export async function GET(_req: Request, { params }: RouteCtx) {
  const sku = params.sku?.trim() || "";
  const file = params.file?.trim() || "";
  const full = resolveProductPhotoFile(sku, file);
  if (!full) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }

  const buf = await readFile(full);
  const objectPath = `productos/${sku.toUpperCase()}/${file}`;
  const cdnUrl = await ensureBunnyPublicUrl(objectPath, buf, "image/webp");
  if (cdnUrl) {
    const res = NextResponse.redirect(cdnUrl, 308);
    res.headers.set("Cache-Control", REDIRECT_CACHE);
    res.headers.set("CDN-Cache-Control", REDIRECT_CACHE);
    return res;
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": BODY_CACHE,
      "CDN-Cache-Control": BODY_CACHE,
    },
  });
}
