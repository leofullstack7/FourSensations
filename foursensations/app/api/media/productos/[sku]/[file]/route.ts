import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolveProductPhotoFile } from "@/lib/server/product-photo-files";

type RouteCtx = { params: { sku: string; file: string } };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: RouteCtx) {
  const full = resolveProductPhotoFile(params.sku, params.file);
  if (!full) {
    return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
  }
  const buf = await readFile(full);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
