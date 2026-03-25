import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteCtx = { params: { id: string; imageId: string } };

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id: productId, imageId } = params;

  try {
    const img = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!img) return noStoreJson({ error: "Imagen no encontrada" }, { status: 404 });

    await prisma.productImage.delete({ where: { id: imageId } });

    const row = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    return noStoreJson({ product: prismaProductToAdmin(row!) });
  } catch (e) {
    console.error("[DELETE .../images/[imageId]]", e);
    return noStoreJson({ error: "Error al eliminar imagen" }, { status: 500 });
  }
}
