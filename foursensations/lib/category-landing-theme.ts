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
  "cuidado-corporal": {
    eyebrow: "Cuidado Corporal · Four Sensations",
    headline: "Tu piel también merece un ritual Four Sensations 💗",
    subtitle:
      "Texturas que se disfrutan, aromas que enamoran y fórmulas pensadas para consentir tu cuerpo con la misma intención que amas en el cabello.",
    ctaExplore: "Ver la categoría",
    commercialLine: "Exfoliantes y rituales para consentir la piel del rostro y el cuerpo.",
    benefits: [],
  },
  accesorios: {
    eyebrow: "Accesorios capilares · Four Sensations",
    headline: "Cepillos, Scrunchies, Gorritos y esos pequeños Must - Haves que hacen la diferencia en tu Rutina.",
    subtitle: "¡El toque mas girly para consentir tu cabello y elevar cada look! ✨",
    ctaExplore: "Ver todos los accesorios",
    commercialLine: "",
    benefits: [],
  },
  mayorista: {
    eyebrow: "Programa mayorista · FOUR SENSATIONS S.A.S.",
    headline: "TU VITRINA ESTÁ PIDIENDO FOUR SENSATIONS 👀💗",
    subtitle:
      "Una marca que tus clientes van a querer descubrir, probar y volver a comprar. Productos con identidad, fórmulas increíbles y una comunidad que ya ama Four Sensations.",
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
