import { listStorefrontBrands } from "@/lib/products";
import { noStoreJson } from "@/lib/server/no-store-json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Lista de marcas activas del catálogo (nombre normalizado + slug). */
export async function GET() {
  try {
    const brands = await listStorefrontBrands();
    return noStoreJson({ brands });
  } catch (e) {
    console.error("[GET /api/store/brands]", e);
    return noStoreJson({ error: "Error al cargar marcas" }, { status: 500 });
  }
}
