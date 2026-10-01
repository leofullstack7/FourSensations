import type { Metadata } from "next";
import { AboutUsClient } from "@/components/store/AboutUsClient";

export const metadata: Metadata = {
  title: "Sobre nosotros — Four Sensations",
  description:
    "Four Sensations nació en 2014 en Manizales. Ciencia, innovación y magia visual para cuidar tu cabello.",
};

export default function SobreNosotrosPage() {
  return <AboutUsClient />;
}
