import { NextRequest } from "next/server";
import { BULK_ZIP_MAX_BYTES } from "@/lib/bulk-import/constants";
import { optimizeBulkZipImages } from "@/lib/bulk-import/zip-optimize";
import { recordAiUsageEvent } from "@/lib/server/ai-spend";
import { requireAdminApi } from "@/lib/server/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const form = await req.formData();
    const zipFile = form.get("zip");

    if (!(zipFile instanceof Blob)) {
      return new Response(JSON.stringify({ error: "Falta archivo ZIP (campo zip)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (zipFile.size > BULK_ZIP_MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: `ZIP demasiado grande (máx. ${BULK_ZIP_MAX_BYTES / (1024 * 1024)} MB)` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const zipBuf = Buffer.from(await zipFile.arrayBuffer());
    const { zipBuffer, stats } = await optimizeBulkZipImages(zipBuf);

    await recordAiUsageEvent({
      kind: "IMAGE_OPTIMIZE",
      note: `${stats.imageCount} imagen(es)`,
      meta: { imageCount: stats.imageCount, savedBytes: stats.savedBytes },
    }).catch(() => null);

    const originalName =
      zipFile instanceof File && zipFile.name.trim()
        ? zipFile.name.replace(/\.zip$/i, "")
        : "imagenes-productos";

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${originalName}-optimizado.zip"`,
        "X-Zip-Before-Bytes": String(stats.beforeBytes),
        "X-Zip-After-Bytes": String(stats.afterBytes),
        "X-Zip-Saved-Bytes": String(stats.savedBytes),
        "X-Zip-Saved-Percent": String(stats.savedPercent),
        "X-Zip-Image-Count": String(stats.imageCount),
        "X-Zip-Skipped-Count": String(stats.skippedAlreadyOptimized),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al optimizar ZIP";
    console.error("[POST /api/admin/import/bulk/zip-optimize]", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
