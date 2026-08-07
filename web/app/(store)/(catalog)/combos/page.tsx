import { CombosLandingClient } from "@/components/store/CombosPromo";
import { getActiveStoreCombos } from "@/lib/server/store-combos";

export const revalidate = 60;

export const metadata = {
  title: "Combos | GinnaBeauty",
  description: "Sets y combos promocionales GinnaBeauty: más belleza, mejor precio.",
};

export default async function CombosPage() {
  const combos = await getActiveStoreCombos();
  return <CombosLandingClient combos={combos} />;
}
