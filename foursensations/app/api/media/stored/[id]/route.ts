import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

const BODY_CACHE = "public, max-age=604800, stale-while-revalidate=2592000";
/** Con Neon Launch se pueden servir fotos un poco más grandes sin tumbar el request. */
const MAX_BYTES = 3_000_000;

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
 * Prefiere estático `/media/stored/{id}.webp` (publicado en build).
 * Fallback: bytes desde DB (lento; evitar en hot path de categorías).
 */
export async function GET(req: NextRequest, { params }: RouteCtx) {
  const id = params.id?.trim() || "";
  if (!/^[a-z0-9]+$/i.test(id)) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  const staticPath = join(process.cwd(), "public", "media", "stored", `${id}.webp`);
  if (existsSync(staticPath)) {
    return NextResponse.redirect(`${publicOrigin(req)}/media/stored/${id}.webp`, 308);
  }

  const meta = await prisma.$queryRaw<
    Array<{ contentType: string; len: number }>
  >`SELECT "contentType", octet_length(bytes)::int AS len FROM "StoredImage" WHERE id = ${id} LIMIT 1`;

  const row = meta[0];
  if (!row) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }
  if (row.len > MAX_BYTES) {
    return NextResponse.json({ error: "Imagen demasiado grande" }, { status: 413 });
  }

  const full = await prisma.storedImage.findUnique({
    where: { id },
    select: { bytes: true },
  });
  if (!full) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(full.bytes), {
    headers: {
      "Content-Type": row.contentType || "application/octet-stream",
      "Cache-Control": BODY_CACHE,
    },
  });
}
