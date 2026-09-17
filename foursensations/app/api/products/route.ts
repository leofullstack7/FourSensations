import { NextResponse } from "next/server";
import { getStorefrontProducts } from "@/lib/products";

/** GET catálogo público (JSON). La tienda puede consumirlo cuando pases a fetch cliente. */
export async function GET() {
  const products = await getStorefrontProducts();
  return NextResponse.json(products);
}
