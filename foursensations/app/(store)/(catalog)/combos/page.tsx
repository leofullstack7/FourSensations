import { CombosLandingClient } from "@/components/store/CombosPromo";
import { getActiveStoreCombos } from "@/lib/server/store-combos";

export const revalidate = 60;

export const metadata = {
  title: "Combos | Four Sensations",
  description: "Sets y combos promocionales Four Sensations: más belleza, mejor precio.",
};

export default async function CombosPage() {
  const combos = await getActiveStoreCombos();
  return <CombosLandingClient combos={combos} />;
}
