import { StoreHomeClient } from "@/components/store/StoreHomeClient";
import { getStorefrontProducts } from "@/lib/products";

/** Catálogo y orden «destacados» vienen de DB; evita HTML estático desactualizado. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StoreHomePage() {
  const products = await getStorefrontProducts();
  return <StoreHomeClient initialProducts={products} />;
}
