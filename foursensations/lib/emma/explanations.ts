/** Copy aprobado «¿Por qué para mí?» (hoja Excel). */

import type { EmmaAnswers, EmmaRoutineItem } from "@/lib/emma/flow";

const APPROVED: Record<string, { fallback: string; never?: string[] }> = {
  Botanical: {
    fallback: "Lo elegí como base de limpieza porque me contaste que tu cabello es normal.",
    never: ["detox", "caspa", "grasa", "anticaspa"],
  },
  "Kit Tentación Nutrición": {
    fallback: "Como sientes tu cabello seco, elegí Tentación Nutrición como base de tu rutina.",
  },
  "Kit Tentación Equilibrio": {
    fallback:
      "Como me dijiste que tu cabello es graso, elegí Tentación Equilibrio como base de limpieza inteligente.",
  },
  "Kit Scalp Therapy": {
    fallback:
      "Elegí Scalp Therapy porque marcaste necesidades de limpieza específica en el cuero cabelludo.",
  },
  "Scrub Glow": {
    fallback:
      "Como marcaste acumulación o descamación, añadí Scrub Glow como paso exfoliante de cuero cabelludo.",
  },
  "Secreto de Primavera": {
    fallback: "Lo elegí porque me contaste que quieres cuidar la caída o favorecer el crecimiento.",
  },
  "Shots Capilares": {
    fallback: "Los elegí como complemento del tónico por tu prioridad de cuidado capilar.",
  },
  "Dulce Renacer": {
    fallback: "Como marcaste resequedad y/o necesidad de nutrición, elegí Dulce Renacer para cuidar los largos.",
  },
  "Sensación Primaveral": {
    fallback: "Como marcaste daño, quiebre o enredos, elegí el repolarizador para acondicionar los largos.",
  },
  "Proteína Capilar": {
    fallback: "Lo elegí para complementar el cuidado de la fibra según las señales que marcaste.",
  },
  "Luna Llena": {
    fallback: "Como me contaste que tienes las puntas maltratadas, elegí Luna Llena para tu rutina SOS de puntas.",
  },
  Suspiros: {
    fallback: "Lo añadí como complemento de tu rutina de puntas.",
  },
  "Fantasía Natural": {
    fallback: "Como expones tu cabello al calor u otras agresiones, añadí protección capilar a tu rutina.",
  },
  "Shine Gloss": {
    fallback: "Como quieres más brillo y/o controlar el frizz, elegí Shine Gloss para el acabado.",
  },
  BloomShine: {
    fallback: "Y para cerrar con un aroma delicioso, puedes elegir tu Hair Mist favorito. 💗",
  },
};

/** Preferir la razón del motor (ya condicionada); si falta, copy aprobado. */
export function explainEmmaItem(item: EmmaRoutineItem, _answers?: EmmaAnswers): string {
  const reason = item.reason?.trim();
  if (reason) return reason;
  return APPROVED[item.productKey]?.fallback ?? `Elegí ${item.productKey} según lo que me contaste.`;
}

export function buildWhyForMeLines(
  items: EmmaRoutineItem[],
  answers?: EmmaAnswers,
): { productKey: string; text: string }[] {
  return items.map((item) => ({
    productKey: item.productKey,
    text: explainEmmaItem(item, answers),
  }));
}

export function assertNoForbiddenClaims(text: string, productKey: string): boolean {
  const never = APPROVED[productKey]?.never ?? [];
  const lower = text.toLowerCase();
  return !never.some((w) => lower.includes(w));
}
