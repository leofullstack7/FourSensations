/**
 * Textos y metadatos visuales por landing de categoría (slug URL = toCategorySlug).
 */
export type CategoryLandingCopy = {
  headline: string;
  subtitle: string;
  ctaExplore: string;
  ctaBack: string;
};

const defaults = (
  label: string
): CategoryLandingCopy => ({
  headline: `${label} que potencia tu estilo`,
  subtitle:
    "Descubre fórmulas premium, tonos tendencia y productos favoritos para comprar con confianza.",
  ctaExplore: "Ver toda la categoría",
  ctaBack: "← Volver al home",
});

const bySlug: Record<string, Partial<CategoryLandingCopy>> = {
  maquillaje: {
    headline: "Maquillaje que eleva cada look",
    subtitle:
      "Bases impecables, color que perdura y acabados de pasarela. Arma tu ritual con piezas icónicas.",
    ctaExplore: "Explorar todo el maquillaje",
  },
  "cuidado-piel": {
    headline: "Cuidado de piel con rutina consciente",
    subtitle:
      "Limpieza suave, activos eficaces y hidratación real. Encuentra tu combinación ideal según tu piel.",
    ctaExplore: "Ver rutinas y tratamientos",
  },
  "cuidado-capilar": {
    headline: "Capilar que se siente saludable",
    subtitle:
      "Reparación, brillo y estilo sin sacrificar el cuero cabelludo. Fórmulas que trabajan contigo.",
    ctaExplore: "Descubrir cuidado capilar",
  },
  unas: {
    headline: "Uñas con color y cuidado",
    subtitle:
      "Esmaltes vibrantes, cuidado de cutículas y herramientas precarias para un resultado de salón.",
    ctaExplore: "Ver uñas y herramientas",
  },
  hombres: {
    headline: "Grooming pensado para él",
    subtitle:
      "Piel lista, barba cuidada y kits prácticos. Menos pasos, mejor resultado.",
    ctaExplore: "Explorar línea hombres",
  },
  accesorios: {
    headline: "Accesorios que completan tu ritual",
    subtitle:
      "Brochas, organización y detalles útiles para que tu rutina sea más fácil y bonita.",
    ctaExplore: "Ver todos los accesorios",
  },
  mayorista: {
    headline: "Mayorista con volumen inteligente",
    subtitle:
      "Paquetes y mínimos claros para negocios que quieren stock confiable y variedad.",
    ctaExplore: "Ver opciones mayoristas",
  },
  tintes: {
    headline: "Tintes que revelan tu tono ideal",
    subtitle:
      "Encuentra tu color explorando por grupo, familia o tipo. Cada burbuja es un color real.",
    ctaExplore: "Ver todos los tintes",
  },
};

export function getCategoryLandingCopy(categoryLabel: string, slug: string): CategoryLandingCopy {
  const base = defaults(categoryLabel);
  const extra = bySlug[slug] ?? {};
  return {
    headline: extra.headline ?? base.headline,
    subtitle: extra.subtitle ?? base.subtitle,
    ctaExplore: extra.ctaExplore ?? base.ctaExplore,
    ctaBack: extra.ctaBack ?? base.ctaBack,
  };
}
