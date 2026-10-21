import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bunnyExtForContentType, ensureBunnyPublicUrl } from "@/lib/server/bunny-storage";
import { optimizeImageToWebp } from "@/lib/server/optimize-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: { id: string } };

const REDIRECT_CACHE = "public, max-age=31536000, immutable, stale-while-revalidate=86400";
const BODY_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

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

  const raw = Buffer.from(row.bytes);
  let serveBuf: Buffer = raw;
  let serveType = row.contentType || "image/webp";

  // Comprime a WebP liviano antes de CDN / respuesta (fotos legacy de varios MB).
  if (raw.length > 180_000) {
    try {
      const optimized = await optimizeImageToWebp(raw, { maxEdge: 1600, quality: 78 });
      serveBuf = Buffer.from(optimized.buffer);
      serveType = optimized.contentType;
    } catch {
      /* conserva original */
    }
  }

  const ext = bunnyExtForContentType(serveType);
  const objectPath = `stored/${id}.${ext}`;
  const cdnUrl = await ensureBunnyPublicUrl(objectPath, serveBuf, serveType);
  if (cdnUrl) {
    const res = NextResponse.redirect(cdnUrl, 308);
    res.headers.set("Cache-Control", REDIRECT_CACHE);
    res.headers.set("CDN-Cache-Control", REDIRECT_CACHE);
    return res;
  }

  return new NextResponse(new Uint8Array(serveBuf), {
    headers: {
      "Content-Type": serveType,
      "Cache-Control": BODY_CACHE,
      "CDN-Cache-Control": BODY_CACHE,
    },
  });
}
