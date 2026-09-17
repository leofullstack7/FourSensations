import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

type RouteCtx = { params: { id: string; imageId: string } };

export async function DELETE(_req: Request, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const existing = await prisma.productImage.findFirst({
    where: { id: params.imageId, productId: params.id },
  });
  if (!existing) return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  await prisma.productImage.delete({ where: { id: params.imageId } });
  revalidateStorefrontProducts();
  const row = await prisma.product.findUniqueOrThrow({
    where: { id: params.id },
    include: { images: true },
  });
  return NextResponse.json({ product: prismaProductToAdmin(row) });
}
