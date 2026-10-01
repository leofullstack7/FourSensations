/**
 * Título + subtítulo de ficha (dos renglones) según marca / Juliana guía 09.
 */
export type ProductDisplayName = {
  title: string;
  subtitle: string;
};

const ENTRIES: Array<{ match: RegExp | string; title: string; subtitle: string }> = [
  { match: /dulce\s*renacer/i, title: "Dulce Renacer", subtitle: "Tratamiento Capilar Nutritivo" },
  { match: /sensaci[oó]n\s*primaveral|repolarizador/i, title: "Sensación Primaveral", subtitle: "Repolarizador Capilar" },
  { match: /prote[ií]na|10\s*en\s*1/i, title: "Proteína Capilar", subtitle: "10 en 1" },
  { match: /botanical/i, title: "Botanical", subtitle: "Shampoo" },
  { match: /tentaci[oó]n\s*equilibrio|cebolla/i, title: "Kit Tentación Equilibrio", subtitle: "Shampoo & Acondicionador Cebolla" },
  { match: /tentaci[oó]n\s*nutrici[oó]n|aguacate/i, title: "Kit Tentación Nutrición", subtitle: "Shampoo & Acondicionador Aguacate" },
  { match: /scalp\s*therapy|carb[oó]n/i, title: "Kit Scalp Therapy", subtitle: "Shampoo & Acondicionador Carbón Activado" },
  { match: /secreto\s*de\s*primavera/i, title: "Secreto de Primavera", subtitle: "Tónico Capilar" },
  { match: /shots?/i, title: "Shots Capilares", subtitle: "Anticaída • Reparación • Crecimiento" },
  { match: /scrub\s*glow/i, title: "Scrub Glow", subtitle: "Exfoliante Capilar" },
  { match: /cepillo|masajeador/i, title: "Cepillo", subtitle: "Masajeador Capilar" },
  { match: /fantas[ií]a\s*natural|bloqueador/i, title: "Fantasía Natural", subtitle: "Bloqueador Capilar" },
  { match: /shine\s*gloss|[oó]leo/i, title: "Shine Gloss", subtitle: "Óleo Capilar" },
  { match: /sweet\s*love/i, title: "Sweet Love", subtitle: "Perfume Capilar" },
  { match: /bloom\s*shine|bloomshine/i, title: "BloomShine", subtitle: "Perfume Capilar" },
  { match: /scarlette/i, title: "Scarlette", subtitle: "Perfume Capilar" },
  { match: /golden\s*glow/i, title: "Golden Glow", subtitle: "Perfume Capilar" },
  { match: /luna\s*llena/i, title: "Luna Llena", subtitle: "Suero Capilar" },
  { match: /suspiros/i, title: "Suspiros", subtitle: "Aceite Multipropósito" },
  { match: /bomba\s*capilar/i, title: "Bomba Capilar", subtitle: "Dulce Renacer + Repolarizador Capilar" },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getProductDisplayName(name: string): ProductDisplayName {
  const raw = name.trim();
  for (const entry of ENTRIES) {
    if (typeof entry.match === "string") {
      if (normalize(raw).toLowerCase().includes(normalize(entry.match).toLowerCase())) {
        return { title: entry.title, subtitle: entry.subtitle };
      }
    } else if (entry.match.test(raw)) {
      return { title: entry.title, subtitle: entry.subtitle };
    }
  }
  return { title: raw, subtitle: "" };
}
