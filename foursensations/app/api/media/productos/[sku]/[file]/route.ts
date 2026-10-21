import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolveProductPhotoFile } from "@/lib/server/product-photo-files";
import { bunnyCdnUrlIfPresent, putImageToBunnyPath } from "@/lib/server/bunny-storage";

type RouteCtx = { params: { sku: string; file: string } };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BODY_CACHE = "public, max-age=604800, stale-while-revalidate=2592000";
const REDIRECT_CACHE = "public, max-age=31536000, immutable";

function migrateProductPhotoInBackground(sku: string, file: string, buf: Buffer) {
  void (async () => {
    try {
      const path = `productos/${sku.toUpperCase()}/${file}`;
      const existing = await bunnyCdnUrlIfPresent(path);
      if (existing) return;
      await putImageToBunnyPath(path, buf, "image/webp");
    } catch (e) {
      console.error("[media/productos] bunny migrate", sku, file, e);
    }
  })();
}

export async function GET(_req: Request, { params }: RouteCtx) {
  const sku = params.sku?.trim() || "";
  const file = params.file?.trim() || "";
  const full = resolveProductPhotoFile(sku, file);
  if (!full) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }

  const objectPath = `productos/${sku.toUpperCase()}/${file}`;
  const cdn = await Promise.race([
    bunnyCdnUrlIfPresent(objectPath),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 350)),
  ]);
  if (cdn) {
    const res = NextResponse.redirect(cdn, 308);
    res.headers.set("Cache-Control", REDIRECT_CACHE);
    return res;
  }

  const buf = await readFile(full);
  migrateProductPhotoInBackground(sku, file, buf);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": BODY_CACHE,
    },
  });
}
