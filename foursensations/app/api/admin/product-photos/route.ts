import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { listProductPhotoFiles } from "@/lib/server/product-photo-files";
import { productMediaPublicUrl } from "@/lib/util/image-url";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const sku = req.nextUrl.searchParams.get("sku")?.trim().toUpperCase() ?? "";
  if (!/^FS\d{3}$/.test(sku)) {
    return NextResponse.json({ error: "SKU inválido" }, { status: 400 });
  }
  const files = listProductPhotoFiles(sku);
  return NextResponse.json({
    sku,
    urls: files.map((file) => productMediaPublicUrl(sku, file)),
  });
}
