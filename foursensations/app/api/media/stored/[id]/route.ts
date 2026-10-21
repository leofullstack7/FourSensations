import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

const BODY_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

/**
 * Sirve bytes desde DB sin Sharp ni Bunny en el request.
 * (Render free 512Mi: migraciones/PUT concurrentes provocaban OOM y tumaban el sitio.)
 */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const id = params.id?.trim() || "";
  if (!/^[a-z0-9]+$/i.test(id)) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  const row = await prisma.storedImage.findUnique({
    where: { id },
    select: { contentType: true, bytes: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.contentType || "application/octet-stream",
      "Cache-Control": BODY_CACHE,
    },
  });
}
