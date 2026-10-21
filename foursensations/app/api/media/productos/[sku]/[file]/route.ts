import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { resolveProductPhotoFile } from "@/lib/server/product-photo-files";

type RouteCtx = { params: { sku: string; file: string } };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BODY_CACHE = "public, max-age=604800, stale-while-revalidate=2592000";

function publicOrigin(req: Request): string {
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (xfHost) return `${xfProto}://${xfHost}`;
  const site = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (site) return site;
  try {
    return new URL(req.url).origin;
  } catch {
    return "https://befoursensations.com";
  }
}

/**
 * Legacy: redirige a estático `/media/productos/...` si existe (rápido, sin Node body).
 * Fallback: lee desde assets/productos.
 */
export async function GET(req: Request, { params }: RouteCtx) {
  const sku = (params.sku || "").trim().toUpperCase();
  const file = (params.file || "").trim();
  const staticPath = join(process.cwd(), "public", "media", "productos", sku, file);
  if (/^FS\d{3}$/i.test(sku) && /^FS\d{3}-\d+\.webp$/i.test(file) && existsSync(staticPath)) {
    return NextResponse.redirect(`${publicOrigin(req)}/media/productos/${sku}/${file}`, 308);
  }

  const full = resolveProductPhotoFile(params.sku, params.file);
  if (!full) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }

  const buf = await readFile(full);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": BODY_CACHE,
    },
  });
}
