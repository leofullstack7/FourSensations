import { NextRequest } from "next/server";
import { z } from "zod";
import {
  CATEGORY_STOREFRONT_FEATURED_COUNT,
  normalizeFeaturedProductIds,
} from "@/lib/category-storefront-featured";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { revalidateCategoryStorefrontProducts } from "@/lib/server/revalidate-category-storefront";
import { requireAdminApi } from "@/lib/server/require-admin-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const putSchema = z.object({
  productIds: z.array(z.string().min(1)).max(CATEGORY_STOREFRONT_FEATURED_COUNT),
});

type RouteCtx = { params: { id: string } };

export type AdminCategoryStorefrontProductCard = {
  id: string;
  name: string;
  brand: string;
  subcategory: string;
  price: number;
  imageUrl: string | null;
  emoji: string | null;
  active: boolean;
};

function mapProduct(row: {
  id: string;
  name: string;
  brand: string;
  subcategory: string;
  price: number;
  imageUrl: string | null;
  emoji: string | null;
  active: boolean;
}): AdminCategoryStorefrontProductCard {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    subcategory: row.subcategory,
    price: row.price,
    imageUrl: row.imageUrl,
    emoji: row.emoji,
    active: row.active,
  };
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        storefrontFeaturedProductIds: true,
      },
    });
    if (!category) return noStoreJson({ error: "Categoría no encontrada" }, { status: 404 });

    const products = await prisma.product.findMany({
      where: { category: category.slug },
      orderBy: [{ featuredInHome: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        brand: true,
        subcategory: true,
        price: true,
        imageUrl: true,
        emoji: true,
        active: true,
      },
    });

    const activeProducts = products.filter((p) => p.active);
    const validIds = new Set(activeProducts.map((p) => p.id));
    const savedIds = normalizeFeaturedProductIds(category.storefrontFeaturedProductIds, validIds);
    const defaultIds = activeProducts.slice(0, CATEGORY_STOREFRONT_FEATURED_COUNT).map((p) => p.id);
    const featuredIds = savedIds.length > 0 ? savedIds : defaultIds;

    return noStoreJson({
      category: {
        id: category.id,
        slug: category.slug,
        name: category.name,
        icon: category.icon,
      },
      featuredIds,
      slotCount: CATEGORY_STOREFRONT_FEATURED_COUNT,
      products: activeProducts.map(mapProduct),
    });
  } catch (e) {
    console.error("[GET storefront-order]", e);
    return noStoreJson({ error: "Error al cargar vitrina" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true },
    });
    if (!category) return noStoreJson({ error: "Categoría no encontrada" }, { status: 404 });

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return noStoreJson({ error: "JSON inválido" }, { status: 400 });
    }

    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return noStoreJson({ error: "Lista de productos inválida" }, { status: 400 });
    }

    const rows = await prisma.product.findMany({
      where: {
        id: { in: parsed.data.productIds },
        category: category.slug,
        active: true,
      },
      select: { id: true },
    });
    const validIds = new Set(rows.map((r) => r.id));
    const productIds = normalizeFeaturedProductIds(parsed.data.productIds, validIds);

    await prisma.category.update({
      where: { id: category.id },
      data: { storefrontFeaturedProductIds: productIds },
    });

    revalidateCategoryStorefrontProducts(category.slug);

    return noStoreJson({ ok: true, featuredIds: productIds });
  } catch (e) {
    console.error("[PUT storefront-order]", e);
    return noStoreJson({ error: "Error al guardar vitrina" }, { status: 500 });
  }
}
