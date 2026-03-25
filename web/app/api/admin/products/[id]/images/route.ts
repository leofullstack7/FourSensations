import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { noStoreJson } from "@/lib/server/no-store-json";
import { isTrustedCdnImageUrl } from "@/lib/server/bunny-config";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const bodySchema = z.object({
  url: z.string().url(),
});

type RouteCtx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const productId = params.id;

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return noStoreJson({ error: "Producto no encontrado" }, { status: 404 });

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return noStoreJson({ error: "JSON inválido" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return noStoreJson({ error: "URL inválida" }, { status: 400 });
    }
    const { url } = parsed.data;
    if (!isTrustedCdnImageUrl(url)) {
      return noStoreJson(
        { error: "La URL debe ser de tu CDN configurado (BUNNY_CDN_BASE_URL)" },
        { status: 400 }
      );
    }

    const agg = await prisma.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    await prisma.productImage.create({
      data: { productId, url, sortOrder },
    });

    const row = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    return noStoreJson({ product: prismaProductToAdmin(row!) });
  } catch (e) {
    console.error("[POST /api/admin/products/[id]/images]", e);
    return noStoreJson({ error: "Error al añadir imagen" }, { status: 500 });
  }
}
