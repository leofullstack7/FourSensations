import { normalizeMenuLookup } from "@/lib/store/menu-item-href";

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

export const HAIR_SUBCATEGORY_PRODUCTS: Record<HairSubcategoryName, readonly string[]> = {
  Tratamientos: ["Dulce Renacer", "Sensación Primaveral", "Proteína 10 en 1", "Proteína Capilar"],
  "Shampoo y Acondicionador": [
    "Botanical",
    "Tentación Equilibrio",
    "Tentación Nutrición",
    "Scalp Therapy",
  ],
  "Crecimiento y Fortalecimiento": ["Secreto de Primavera", "Shots"],
  "Detox y Cuero Cabelludo": ["Scrub Glow", "Scalp Therapy", "Cepillo Masajeador Capilar"],
  "Finalizadores y Protección": ["Fantasía Natural", "Shine Gloss"],
  "Hair Mist": ["Sweet Love", "Bloom Shine", "Scarlette", "Golden Glow"],
  "Reparación de Puntas": ["Luna Llena", "Suspiros"],
  "Pre - Shampoo": ["Bomba Capilar"],
};

const LEGACY_GROUP_TO_SUB: Record<string, HairSubcategoryName> = {
  tratamientos: "Tratamientos",
  rutinas: "Shampoo y Acondicionador",
  "shampoo y acondicionador": "Shampoo y Acondicionador",
  finalizadores: "Finalizadores y Protección",
  "finalizadores y proteccion": "Finalizadores y Protección",
  tonicos: "Crecimiento y Fortalecimiento",
  "crecimiento y fortalecimiento": "Crecimiento y Fortalecimiento",
  fragancias: "Hair Mist",
  "hair mist": "Hair Mist",
  brumas: "Hair Mist",
  "brumas capilares": "Hair Mist",
  multiuso: "Reparación de Puntas",
  "reparacion de puntas": "Reparación de Puntas",
  "detox y cuero cabelludo": "Detox y Cuero Cabelludo",
  "pre - shampoo": "Pre - Shampoo",
  "pre-shampoo": "Pre - Shampoo",
  "pre shampoo": "Pre - Shampoo",
};

function productNameMatches(productName: string, catalogName: string): boolean {
  const a = normalizeMenuLookup(productName);
  const b = normalizeMenuLookup(catalogName);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.min(a.length, b.length) >= 5 && (a.includes(b) || b.includes(a))) return true;
  return false;
}

export function productBelongsToHairSubcategory(productName: string, subcategory: string): boolean {
  const mapped = resolveHairSubcategoryName(subcategory);
  if (!mapped) return normalizeMenuLookup(productName) === normalizeMenuLookup(subcategory);
  return HAIR_SUBCATEGORY_PRODUCTS[mapped].some((name) => productNameMatches(productName, name));
}

export function hairSubcategoryForProductName(name: string): HairSubcategoryName | null {
  for (const sub of HAIR_SUBCATEGORY_ORDER) {
    if (HAIR_SUBCATEGORY_PRODUCTS[sub].some((item) => productNameMatches(name, item))) {
      return sub;
    }
  }
  return resolveHairSubcategoryName(name);
}

export function resolveHairSubcategoryName(value: string): HairSubcategoryName | null {
  const key = normalizeMenuLookup(value);
  if (LEGACY_GROUP_TO_SUB[key]) return LEGACY_GROUP_TO_SUB[key];
  return HAIR_SUBCATEGORY_ORDER.find((sub) => normalizeMenuLookup(sub) === key) ?? null;
}
