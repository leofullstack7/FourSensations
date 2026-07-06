import { NextRequest } from "next/server";
import { getStorefrontProductsByCategory } from "@/lib/products";
import { noStoreJson } from "@/lib/server/no-store-json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteCtx = { params: { slug: string } };

/** Catálogo completo de una categoría (carga diferida en la landing). */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const products = await getStorefrontProductsByCategory(params.slug);
    return noStoreJson({ products, totalCount: products.length });
  } catch (e) {
    console.error("[GET /api/store/category/[slug]/products]", e);
    return noStoreJson({ error: "Error al cargar productos" }, { status: 500 });
  }
}
