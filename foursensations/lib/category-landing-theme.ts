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
    headline: "Tu cabello está a punto de conocer sus nuevas obsesiones 💗",
    subtitle:
      "Fórmulas creadas para nutrir, reparar, proteger, fortalecer y transformar tu rutina capilar, con ingredientes increíbles, texturas que vas a amar y resultados que se sienten desde el primer uso✨",
    ctaExplore: "DESCUBRE TODO!",
    commercialLine:
      "Desde la raíz hasta las puntas, aquí empieza ese HAIR GLOW UP que tu cabello estaba pidiendo.",
    benefits: [
      {
        icon: "👩🏼‍🦱",
        title: "PARA CADA HAIR MOOD",
        text: "Resequedad, frizz, daño, grasa, caída o falta de brillo… aquí hay un favorito esperando por tu cabello.",
      },
      {
        icon: "🌸✨",
        title: "TU PELO EN SU BEST ERA",
        text: "Productos pensados para llevar tu rutina a otro nivel y sacar la mejor versión de tu cabello",
      },
      {
        icon: "🎀",
        title: "ENCUENTRA TU NUEVA OBSESIÓN",
        text: "Una Four Girl nunca tiene demasiados favoritos 💗 Prepárate para encontrar el próximo que no vas a querer soltar.",
      },
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
