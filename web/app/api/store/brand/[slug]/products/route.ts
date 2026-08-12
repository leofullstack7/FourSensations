import { NextRequest } from "next/server";
import { getStorefrontBrandProductsPage } from "@/lib/products";
import { noStoreJson } from "@/lib/server/no-store-json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteCtx = { params: { slug: string } };

const DEFAULT_TAKE = 24;
const MAX_TAKE = 48;

/** Productos de una marca por páginas. */
export async function GET(req: NextRequest, { params }: RouteCtx) {
  try {
    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor");
    const take = Math.min(
      MAX_TAKE,
      Math.max(1, Number(searchParams.get("take") ?? String(DEFAULT_TAKE)) || DEFAULT_TAKE),
    );

    const page = await getStorefrontBrandProductsPage(params.slug, { take, cursor });
    return noStoreJson({
      products: page.products,
      nextCursor: page.nextCursor,
      hasMore: Boolean(page.nextCursor),
      totalCount: page.totalCount,
    });
  } catch (e) {
    console.error("[GET /api/store/brand/[slug]/products]", e);
    return noStoreJson({ error: "Error al cargar productos" }, { status: 500 });
  }
}
