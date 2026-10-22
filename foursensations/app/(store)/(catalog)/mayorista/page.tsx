import { StoreCatalogSeed } from "@/components/store/StoreCatalogSeed";
import { WholesaleLandingClient } from "@/components/store/WholesaleLandingClient";
import { getStorefrontProducts } from "@/lib/products";
import { pickRandomCollageImages } from "@/lib/server/pick-collage-images";
import { getSiteSettingsData } from "@/lib/server/site-settings";
import { landingCollageUrls } from "@/lib/site-settings";

export const metadata = {
  title: "Programa Mayorista | Four Sensations",
  description:
    "TU VITRINA ESTÁ PIDIENDO FOUR SENSATIONS. Precios de volumen desde $700.000 y una marca que tus clientes van a querer volver a comprar.",
};

export const revalidate = 60;

export default async function MayoristaPage() {
  const [products, settings] = await Promise.all([getStorefrontProducts(), getSiteSettingsData()]);
  const customCollage = landingCollageUrls(settings, "mayorista");
  const filler = customCollage.length >= 3 ? [] : await pickRandomCollageImages(["mayorista"], 8);
  const collageUrls = [...customCollage, ...filler.filter((url) => !customCollage.includes(url))].slice(0, 3);

  return (
    <>
      <StoreCatalogSeed products={products} />
      <WholesaleLandingClient products={products} collageUrls={collageUrls} />
    </>
  );
}
