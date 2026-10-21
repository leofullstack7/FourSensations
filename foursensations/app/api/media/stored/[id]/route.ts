import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

const BODY_CACHE = "public, max-age=86400, stale-while-revalidate=604800";
const MAX_BYTES = 1_500_000;

/**
 * Sirve bytes desde DB sin Sharp ni Bunny en el request.
 * (Render free 512Mi: migraciones/PUT concurrentes provocaban OOM y tumaban el sitio.)
 */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const id = params.id?.trim() || "";
  if (!/^[a-z0-9]+$/i.test(id)) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  // Primero solo el tamaño: no materializar BYTEA enormes en heap.
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
