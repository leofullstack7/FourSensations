import { NextRequest } from "next/server";
import { getStorefrontProducts } from "@/lib/products";
import { noStoreJson } from "@/lib/server/no-store-json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Catálogo completo — solo para home o búsqueda global (no en layout de categoría). */
export async function GET(_req: NextRequest) {
  try {
    const products = await getStorefrontProducts();
    return noStoreJson({ products, totalCount: products.length });
  } catch (e) {
    console.error("[GET /api/store/catalog]", e);
    return noStoreJson({ error: "Error al cargar catálogo" }, { status: 500 });
  }
}
