import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { isTrustedCdnImageUrl } from "@/lib/server/bunny-config";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

type RouteCtx = { params: { id: string } };

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const url = raw?.trim() ?? "";
    if (!url || seen.has(url) || !isTrustedCdnImageUrl(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export async function PUT(req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const json = (await req.json()) as { primaryUrl?: string | null; hoverUrl?: string | null };
  const primaryUrl = json.primaryUrl?.trim() || null;
  const hoverUrl = json.hoverUrl?.trim() || null;
  if (primaryUrl && !isTrustedCdnImageUrl(primaryUrl)) {
    return NextResponse.json({ error: "Foto principal no permitida" }, { status: 400 });
  }
  if (hoverUrl && !isTrustedCdnImageUrl(hoverUrl)) {
    return NextResponse.json({ error: "Foto hover no permitida" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

  const rest = uniqueUrls([
    hoverUrl && hoverUrl !== primaryUrl ? hoverUrl : null,
    ...product.images.map((im) => im.url),
    product.imageUrl,
  ]).filter((url) => url !== primaryUrl);

  await prisma.$transaction([
    prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: primaryUrl },
    }),
    prisma.productImage.deleteMany({ where: { productId: product.id } }),
    ...(rest.length
      ? [
          prisma.productImage.createMany({
            data: rest.map((url, sortOrder) => ({ productId: product.id, url, sortOrder })),
          }),
        ]
      : []),
  ]);

  revalidateStorefrontProducts();
  const row = await prisma.product.findUniqueOrThrow({
    where: { id: product.id },
    include: { images: true },
  });
  return NextResponse.json({ product: prismaProductToAdmin(row) });
}
