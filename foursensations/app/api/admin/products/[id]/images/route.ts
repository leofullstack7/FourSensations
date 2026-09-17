import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { isTrustedCdnImageUrl } from "@/lib/server/bunny-config";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

type RouteCtx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const json = (await req.json()) as { url?: string };
    const url = json.url?.trim() ?? "";
    if (!url || !isTrustedCdnImageUrl(url)) {
      return NextResponse.json({ error: "URL de imagen no permitida" }, { status: 400 });
    }
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    if (product.images.length >= 80) {
      return NextResponse.json({ error: "Máximo 80 imágenes extra" }, { status: 400 });
    }
    const sortOrder = (product.images.at(-1)?.sortOrder ?? -1) + 1;
    await prisma.productImage.create({ data: { productId: product.id, url, sortOrder } });
    revalidateStorefrontProducts();
    const row = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { images: true },
    });
    return NextResponse.json({ product: prismaProductToAdmin(row) });
  } catch (e) {
    console.error("[POST images]", e);
    return NextResponse.json({ error: "No se pudo añadir la imagen" }, { status: 500 });
  }
}
