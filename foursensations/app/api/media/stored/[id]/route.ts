import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bunnyExtForContentType, bunnyCdnUrlIfPresent, putImageToBunnyPath } from "@/lib/server/bunny-storage";
import { optimizeImageToWebp } from "@/lib/server/optimize-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

const BODY_CACHE = "public, max-age=86400, stale-while-revalidate=604800";
const REDIRECT_CACHE = "public, max-age=31536000, immutable";

/** Migración a Bunny en segundo plano (no bloquea el request ni satura la respuesta). */
function migrateStoredToBunnyInBackground(id: string, bytes: Buffer, contentType: string) {
  void (async () => {
    try {
      let buf = bytes;
      let type = contentType || "image/webp";
      if (bytes.length > 180_000) {
        try {
          const optimized = await optimizeImageToWebp(bytes, { maxEdge: 1600, quality: 78 });
          buf = Buffer.from(optimized.buffer);
          type = optimized.contentType;
        } catch {
          /* conserva original */
        }
      }
      const ext = bunnyExtForContentType(type);
      const path = `stored/${id}.${ext}`;
      if (await bunnyCdnUrlIfPresent(path)) return;
      await putImageToBunnyPath(path, buf, type);
    } catch (e) {
      console.error("[media/stored] bunny migrate", id, e);
    }
  })();
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const id = params.id?.trim() || "";
  if (!/^[a-z0-9]+$/i.test(id)) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  for (const ext of ["webp", "jpg", "png", "gif"] as const) {
    const cdn = await Promise.race([
      bunnyCdnUrlIfPresent(`stored/${id}.${ext}`),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 250)),
    ]);
    if (cdn) {
      const res = NextResponse.redirect(cdn, 308);
      res.headers.set("Cache-Control", REDIRECT_CACHE);
      return res;
    }
  }

  const row = await prisma.storedImage.findUnique({
    where: { id },
    select: { contentType: true, bytes: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }

  const raw = Buffer.from(row.bytes);
  migrateStoredToBunnyInBackground(id, raw, row.contentType || "image/webp");

  // Respuesta inmediata: sin sharp en el hot path (evita OOM / caídas en Render free).
  return new NextResponse(new Uint8Array(raw), {
    headers: {
      "Content-Type": row.contentType || "application/octet-stream",
      "Cache-Control": BODY_CACHE,
    },
  });
}
