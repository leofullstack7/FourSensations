import type { Metadata } from "next";
import { HeaderArcPrototype } from "@/components/lab/HeaderArcPrototype";
import "./header-arco-lab.css";

export const metadata: Metadata = {
  title: "Lab · Header arco | GinnaBeauty",
  robots: { index: false, follow: false },
};

/** Prototipo aislado: no usa StorefrontShell ni el header de producción. */
export default function HeaderArcoLabPage() {
  return <HeaderArcPrototype />;
}
