/**
 * Taxonomía pública de Cuidado Capilar (Juliana / guía 09).
 * Matching por nombre de producto (no solo subcategory en DB).
 */

export const HAIR_SUBCATEGORY_ORDER = [
  "Tratamientos",
  "Shampoo y Acondicionador",
  "Crecimiento y Fortalecimiento",
  "Detox y Cuero Cabelludo",
  "Finalizadores y Protección",
  "Hair Mist",
  "Reparación de Puntas",
  "Pre - Shampoo",
] as const;

export type HairSubcategoryName = (typeof HAIR_SUBCATEGORY_ORDER)[number];

/** Productos canónicos por subcategoría (títulos de marca). */
export const HAIR_SUBCATEGORY_PRODUCTS: Record<HairSubcategoryName, readonly string[]> = {
  Tratamientos: ["Dulce Renacer", "Sensación Primaveral", "Proteína Capilar", "Proteína 10 en 1"],
  "Shampoo y Acondicionador": ["Botanical", "Tentación Nutrición", "Tentación Equilibrio"],
  "Crecimiento y Fortalecimiento": ["Secreto de Primavera", "Shots Capilares", "Shots Capilares x3", "Shots x3"],
  "Detox y Cuero Cabelludo": ["Scrub Glow", "Scalp Therapy", "Kit Scalp Therapy", "Cepillo Masajeador"],
  "Finalizadores y Protección": ["Fantasía Natural", "Shine Gloss"],
  "Hair Mist": ["Sweet Love", "BloomShine", "Bloom Shine", "Scarlette", "Golden Glow", "Perfumes Capilares"],
  "Reparación de Puntas": ["Luna Llena", "Suspiros"],
  "Pre - Shampoo": ["Bomba Capilar"],
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const NAME_RULES: Array<{ sub: HairSubcategoryName; patterns: RegExp[] }> = [
  { sub: "Pre - Shampoo", patterns: [/bomba\s*capilar/i] },
  { sub: "Tratamientos", patterns: [/dulce\s*renacer/i, /sensaci[oó]n\s*primaveral|repolarizador/i, /prote[ií]na|10\s*en\s*1/i] },
  {
    sub: "Shampoo y Acondicionador",
    patterns: [/botanical/i, /tentaci[oó]n\s*(nutrici[oó]n|equilibrio)/i],
  },
  { sub: "Crecimiento y Fortalecimiento", patterns: [/secreto\s*de\s*primavera/i, /shots?/i] },
  {
    sub: "Detox y Cuero Cabelludo",
    patterns: [/scrub\s*glow/i, /scalp\s*therapy/i, /cepillo\s*masajeador|masajeador/i],
  },
  { sub: "Finalizadores y Protección", patterns: [/fantas[ií]a\s*natural|bloqueador/i, /shine\s*gloss/i] },
  {
    sub: "Hair Mist",
    patterns: [/sweet\s*love/i, /bloom\s*shine|bloomshine/i, /scarlette/i, /golden\s*glow/i, /brumas?/i, /perfumes?\s*capilar/i],
  },
  { sub: "Reparación de Puntas", patterns: [/luna\s*llena/i, /suspiros/i] },
];

/** Alias de subcats viejas → nuevas (por si la DB aún tiene nombres anteriores). */
const LEGACY_SUB_MAP: Record<string, HairSubcategoryName> = {
  tratamientos: "Tratamientos",
  rutinas: "Shampoo y Acondicionador",
  "shampoo y acondicionador": "Shampoo y Acondicionador",
  "shampoo y acondicionadores": "Shampoo y Acondicionador",
  finalizadores: "Finalizadores y Protección",
  "finalizadores y proteccion": "Finalizadores y Protección",
  tonicos: "Crecimiento y Fortalecimiento",
  tónicos: "Crecimiento y Fortalecimiento",
  "crecimiento y fortalecimiento": "Crecimiento y Fortalecimiento",
  "detox y cuero cabelludo": "Detox y Cuero Cabelludo",
  fragancias: "Hair Mist",
  "hair mist": "Hair Mist",
  multiuso: "Reparación de Puntas",
  "reparacion de puntas": "Reparación de Puntas",
  "pre - shampoo": "Pre - Shampoo",
  "pre shampoo": "Pre - Shampoo",
};

function namesLooselyMatch(productName: string, listedName: string): boolean {
  const key = normalizeName(productName);
  const listed = normalizeName(listedName);
  if (!key || !listed) return false;
  return key === listed || key.includes(listed) || listed.includes(key);
}

/** Subcategorías en las que el nombre está listado de forma explícita. */
export function listedHairSubcategories(name: string): HairSubcategoryName[] {
  return HAIR_SUBCATEGORY_ORDER.filter((sub) =>
    HAIR_SUBCATEGORY_PRODUCTS[sub].some((listed) => namesLooselyMatch(name, listed)),
  );
}

export function hairSubcategoryForProductName(name: string, dbSubcategory?: string | null): HairSubcategoryName | null {
  const listed = listedHairSubcategories(name);
  if (listed.length > 0) return listed[0]!;

  for (const rule of NAME_RULES) {
    if (rule.patterns.some((re) => re.test(name))) return rule.sub;
  }
  if (dbSubcategory) {
    const key = normalizeName(dbSubcategory);
    for (const sub of HAIR_SUBCATEGORY_ORDER) {
      if (normalizeName(sub) === key) return sub;
    }
    if (LEGACY_SUB_MAP[key]) return LEGACY_SUB_MAP[key]!;
  }
  return null;
}

export function productMatchesHairSubcategory(
  product: { name: string; subcategory?: string | null },
  subcategory: string,
): boolean {
  const want = normalizeName(subcategory);
  if (listedHairSubcategories(product.name).some((sub) => normalizeName(sub) === want)) return true;
  const resolved = hairSubcategoryForProductName(product.name, product.subcategory);
  if (resolved && normalizeName(resolved) === want) return true;
  if (product.subcategory && normalizeName(product.subcategory) === want) return true;
  return false;
}
