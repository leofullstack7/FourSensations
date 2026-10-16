/**
 * Alinea subcategory de productos cuidado-capilar con la taxonomía canónica (guía 09).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const HAIR_SUBCATEGORY_PRODUCTS = {
  Tratamientos: ["Dulce Renacer", "Sensación Primaveral", "Proteína Capilar", "Proteína 10 en 1"],
  "Shampoo y Acondicionador": ["Botanical", "Tentación Nutrición", "Tentación Equilibrio"],
  "Crecimiento y Fortalecimiento": ["Secreto de Primavera", "Shots Capilares", "Shots Capilares x3", "Shots x3"],
  "Detox y Cuero Cabelludo": ["Scrub Glow", "Scalp Therapy", "Kit Scalp Therapy", "Cepillo Masajeador"],
  "Finalizadores y Protección": ["Fantasía Natural", "Shine Gloss"],
  "Hair Mist": ["Sweet Love", "BloomShine", "Bloom Shine", "Scarlette", "Golden Glow", "Perfumes Capilares"],
  "Reparación de Puntas": ["Luna Llena", "Suspiros"],
  "Pre - Shampoo": ["Bomba Capilar"],
};

const NAME_RULES = [
  { sub: "Pre - Shampoo", patterns: [/bomba\s*capilar/i] },
  { sub: "Tratamientos", patterns: [/dulce\s*renacer/i, /sensaci[oó]n\s*primaveral|repolarizador/i, /prote[ií]na|10\s*en\s*1/i] },
  { sub: "Shampoo y Acondicionador", patterns: [/botanical/i, /tentaci[oó]n\s*(nutrici[oó]n|equilibrio)/i] },
  { sub: "Crecimiento y Fortalecimiento", patterns: [/secreto\s*de\s*primavera/i, /shots?/i] },
  { sub: "Detox y Cuero Cabelludo", patterns: [/scrub\s*glow/i, /scalp\s*therapy/i, /cepillo\s*masajeador|masajeador/i] },
  { sub: "Finalizadores y Protección", patterns: [/fantas[ií]a\s*natural|bloqueador/i, /shine\s*gloss/i] },
  { sub: "Hair Mist", patterns: [/sweet\s*love/i, /bloom\s*shine|bloomshine/i, /scarlette/i, /golden\s*glow/i, /brumas?/i, /perfumes?\s*capilar/i] },
  { sub: "Reparación de Puntas", patterns: [/luna\s*llena/i, /suspiros/i] },
];

const LEGACY = {
  tratamientos: "Tratamientos",
  rutinas: "Shampoo y Acondicionador",
  "shampoo y acondicionador": "Shampoo y Acondicionador",
  "shampoo y acondicionadores": "Shampoo y Acondicionador",
  finalizadores: "Finalizadores y Protección",
  "finalizadores y proteccion": "Finalizadores y Protección",
  tonicos: "Crecimiento y Fortalecimiento",
  "crecimiento y fortalecimiento": "Crecimiento y Fortalecimiento",
  "detox y cuero cabelludo": "Detox y Cuero Cabelludo",
  fragancias: "Hair Mist",
  "hair mist": "Hair Mist",
  multiuso: "Reparación de Puntas",
  "reparacion de puntas": "Reparación de Puntas",
  "pre - shampoo": "Pre - Shampoo",
  "pre shampoo": "Pre - Shampoo",
};

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function resolveSub(name, dbSub) {
  for (const [sub, listed] of Object.entries(HAIR_SUBCATEGORY_PRODUCTS)) {
    for (const item of listed) {
      const a = normalizeName(name);
      const b = normalizeName(item);
      if (a === b || a.includes(b) || b.includes(a)) return sub;
    }
  }
  for (const rule of NAME_RULES) {
    if (rule.patterns.some((re) => re.test(name))) return rule.sub;
  }
  if (dbSub) {
    const key = normalizeName(dbSub);
    if (LEGACY[key]) return LEGACY[key];
    for (const sub of Object.keys(HAIR_SUBCATEGORY_PRODUCTS)) {
      if (normalizeName(sub) === key) return sub;
    }
  }
  return null;
}

const prisma = new PrismaClient();
const rows = await prisma.product.findMany({
  where: { category: "cuidado-capilar" },
  select: { id: true, name: true, subcategory: true },
});

let updated = 0;
for (const row of rows) {
  const next = resolveSub(row.name, row.subcategory);
  if (!next || next === row.subcategory) continue;
  await prisma.product.update({ where: { id: row.id }, data: { subcategory: next } });
  console.log(`${row.name}: "${row.subcategory}" → "${next}"`);
  updated += 1;
}
console.log(`Done. Updated ${updated}/${rows.length}`);
await prisma.$disconnect();
