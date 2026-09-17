import { WholesaleLandingClient } from "@/components/store/WholesaleLandingClient";
import { pickRandomCollageImages } from "@/lib/server/pick-collage-images";

export const metadata = {
  title: "Programa Mayorista | Four Sensations",
  description:
    "Conviértete en mayorista Four Sensations: precios de volumen desde $700.000, despacho desde Manizales y acompañamiento del equipo.",
};

export const revalidate = 60;

export default async function MayoristaPage() {
  const collageUrls = await pickRandomCollageImages(["mayorista", "cuidado-capilar", "accesorios"], 3);

  return <WholesaleLandingClient collageUrls={collageUrls} />;
}
