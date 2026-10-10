import { StoreCatalogSeed } from "@/components/store/StoreCatalogSeed";
import { WholesaleLandingClient } from "@/components/store/WholesaleLandingClient";
import { getStorefrontProducts } from "@/lib/products";
import { pickRandomCollageImages } from "@/lib/server/pick-collage-images";

export const metadata = {
  title: "Programa Mayorista | Four Sensations",
  description:
    "Conviértete en mayorista Four Sensations: precios de volumen desde $700.000, despacho desde Manizales y acompañamiento del equipo.",
};

export const revalidate = 60;

export default async function MayoristaPage() {
  const [collageUrls, products] = await Promise.all([
    pickRandomCollageImages(["mayorista", "cuidado-capilar", "accesorios"], 3),
    getStorefrontProducts(),
  ]);

  return (
    <>
      <StoreCatalogSeed products={products} />
      <WholesaleLandingClient collageUrls={collageUrls} products={products} />
    </>
  );
}
