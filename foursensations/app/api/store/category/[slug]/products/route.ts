import { NextRequest } from "next/server";
import { getStorefrontCategoryProductsPage } from "@/lib/products";
import { noStoreJson } from "@/lib/server/no-store-json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteCtx = { params: { slug: string } };

const DEFAULT_TAKE = 24;
const MAX_TAKE = 48;

/** Productos de una categoría por páginas (solo bajo demanda desde la landing). */
export async function GET(req: NextRequest, { params }: RouteCtx) {
  try {
    const { searchParams } = req.nextUrl;
    const skip = Math.max(0, Number(searchParams.get("skip") ?? "0") || 0);
    const take = Math.min(
      MAX_TAKE,
      Math.max(1, Number(searchParams.get("take") ?? String(DEFAULT_TAKE)) || DEFAULT_TAKE),
    );
    const excludeRaw = searchParams.get("exclude") ?? "";
    const excludeIds = excludeRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const page = await getStorefrontCategoryProductsPage(params.slug, { skip, take, excludeIds });
    return noStoreJson(page);
  } catch (e) {
    console.error("[GET /api/store/category/[slug]/products]", e);
    return noStoreJson({ error: "Error al cargar productos" }, { status: 500 });
  }
}
