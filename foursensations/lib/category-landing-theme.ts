import type { HairSubcategoryName } from "@/lib/hair-subcategories";

export type CategoryBenefit = { icon: string; title: string; text: string };

export type CategoryLandingCopy = {
  eyebrow: string;
  headline: string;
  subtitle: string;
  ctaExplore: string;
  ctaBack: string;
  benefits: CategoryBenefit[];
  commercialLine: string;
};

const defaults = (label: string): CategoryLandingCopy => ({
  eyebrow: `Four Sensations · ${label}`,
  headline: `${label} con ciencia y encanto`,
  subtitle: "Fórmulas con intención, despacho desde Manizales y la calidez del Club de los Cabellos Perfectos.",
  ctaExplore: "Ver toda la categoría",
  ctaBack: "← Volver al home",
  benefits: [
    { icon: "🌿", title: "Fórmulas con intención", text: "Activos pensados para resultados reales, no para relleno de vitrina." },
    { icon: "📦", title: "Despacho nacional", text: "Salimos de Manizales a todo Colombia, con preparación en máximo 2 días hábiles." },
    { icon: "♥", title: "Club FS", text: "Acompañamos tu ritual: calidad, trazabilidad y atención cercana." },
  ],
  commercialLine: "Elige, siente y lleva a casa el ritual Four Sensations.",
});

const bySlug: Record<string, Partial<CategoryLandingCopy>> = {
  "cuidado-capilar": {
    eyebrow: "Cuidado capilar · Club de los Cabellos Perfectos",
    headline: "Tu cabello, con ciencia y encanto",
    subtitle:
      "Tratamientos, shampoo y acondicionador, crecimiento, detox, finalizadores, Hair Mist, puntas y pre-shampoo. Cada línea Four Sensations nace para un gesto concreto.",
    ctaExplore: "Ver todo el cuidado capilar",
    commercialLine: "Arma tu protocolo: proteína, nutrición, cuero cabelludo o un aceite que selle el look.",
    benefits: [
      { icon: "🧬", title: "Protocolos reales", text: "Ocho familias: Tratamientos, Shampoo y Acondicionador, Crecimiento, Detox, Finalizadores, Hair Mist, Puntas y Pre-Shampoo." },
      { icon: "✨", title: "Resultado que se ve", text: "Menos frizz, más brillo, fibra nutrida y cuero cabelludo en calma." },
      { icon: "🚚", title: "De Manizales a tu casa", text: "Pedidos preparados en máximo 2 días hábiles, con cobertura nacional." },
    ],
  },
  accesorios: {
    eyebrow: "Accesorios capilares · Four Sensations",
    headline: "El detalle que cierra el ritual",
    subtitle:
      "Diademas, gorros, cepillos, ligas y pinzas para acompañar la fórmula: un cepillo que masajea, un recoger que no maltrata, un accesorio que viste el peinado. Piezas pensadas para el cabello, no para el cajón.",
    ctaExplore: "Ver todos los accesorios",
    commercialLine: "Suma textura, sujeción y cuidado a tu rutina con piezas que se sienten Four Sensations.",
    benefits: [
      { icon: "🎀", title: "Hechos para el cabello", text: "Accesorios que respetan la fibra: recoger, peinar y vestir sin agresiones." },
      { icon: "🪞", title: "Look + cuidado", text: "El mismo encanto de las fórmulas, ahora en piezas que usas todos los días." },
      { icon: "📦", title: "Llega con tu pedido", text: "Combínalos con tratamientos y rutinas: un solo despacho desde Manizales." },
    ],
  },
  mayorista: {
    eyebrow: "Programa mayorista · FOUR SENSATIONS S.A.S.",
    headline: "Lleva Four Sensations a tu negocio",
    subtitle:
      "Precios de volumen, acompañamiento 1:1 y despacho nacional desde Manizales. Pensado para salones, tiendas y emprendedoras que quieren stock con calidad y trazabilidad.",
    ctaExplore: "Escribir por WhatsApp",
    commercialLine: "Pedidos desde $700.000 acceden a tarifa mayorista y a un agente del equipo.",
    benefits: [],
  },
  tintes: {
    eyebrow: "Tintes · Four Sensations",
    headline: "Tintes que revelan tu tono ideal",
    subtitle: "Encuentra tu color explorando por grupo, familia o tipo. Cada burbuja es un color real.",
    ctaExplore: "Ver todos los tintes",
  },
};

export function getCategoryLandingCopy(categoryLabel: string, slug: string): CategoryLandingCopy {
  const base = defaults(categoryLabel);
  const extra = bySlug[slug] ?? {};
  return {
    eyebrow: extra.eyebrow ?? base.eyebrow,
    headline: extra.headline ?? base.headline,
    subtitle: extra.subtitle ?? base.subtitle,
    ctaExplore: extra.ctaExplore ?? base.ctaExplore,
    ctaBack: extra.ctaBack ?? base.ctaBack,
    benefits: extra.benefits ?? base.benefits,
    commercialLine: extra.commercialLine ?? base.commercialLine,
  };
}

export const HAIR_FILTER_GROUPS: HairSubcategoryName[] = [
  "Tratamientos",
  "Shampoo y Acondicionador",
  "Crecimiento y Fortalecimiento",
  "Detox y Cuero Cabelludo",
  "Finalizadores y Protección",
  "Hair Mist",
  "Reparación de Puntas",
  "Pre - Shampoo",
];
