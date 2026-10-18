import { StoreCatalogSeed } from "@/components/store/StoreCatalogSeed";
import { WholesaleLandingClient } from "@/components/store/WholesaleLandingClient";
import { getStorefrontProducts } from "@/lib/products";

export const metadata = {
  title: "Programa Mayorista | Four Sensations",
  description:
    "TU VITRINA ESTÁ PIDIENDO FOUR SENSATIONS. Precios de volumen desde $700.000 y una marca que tus clientes van a querer volver a comprar.",
};

export const revalidate = 60;

export default async function MayoristaPage() {
  const products = await getStorefrontProducts();

  return (
    <>
      <StoreCatalogSeed products={products} />
      <WholesaleLandingClient products={products} />
    </>
  );
}
