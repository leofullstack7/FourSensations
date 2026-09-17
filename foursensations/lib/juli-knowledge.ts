import { getCatalogKnowledgeBlob, getCatalogProductCopy } from "@/lib/catalog-product-copy";
import { normalizeMenuLookup } from "@/lib/store/menu-item-href";
import type { StoreProduct } from "@/lib/types/product";

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Palabras clave → productos Four Sensations del catálogo oficial.
 * Disparan recomendaciones precisas en Juli AI.
 */
export const JULI_CONCERN_TRIGGERS: {
  id: string;
  keywords: string[];
  products: string[];
  hint: string;
}[] = [
  {
    id: "frizz",
    keywords: ["frizz", "encresp", "electric", "rebelde", "indisciplin", "esponjad", "humedad"],
    products: ["Dulce Renacer", "Sensación Primaveral", "Shine Gloss", "Fantasía Natural"],
    hint: "control de frizz",
  },
  {
    id: "seco",
    keywords: ["seco", "seca", "resec", "opaco", "opaca", "poroso", "porosa", "aspereza", "aspero", "áspero", "deshidrat"],
    products: ["Dulce Renacer", "Tentación Nutrición", "Sensación Primaveral", "Luna Llena"],
    hint: "nutrición para cabello seco",
  },
  {
    id: "danado",
    keywords: [
      "danad",
      "dañad",
      "maltrat",
      "quimic",
      "químic",
      "decolor",
      "plancha",
      "calor",
      "puntas abiertas",
      "quebradiz",
      "chamus",
    ],
    products: ["Proteína 10 en 1", "Dulce Renacer", "Sensación Primaveral", "Shots"],
    hint: "reparación de fibra",
  },
  {
    id: "proteina",
    keywords: ["proteina", "proteína", "10 en 1", "reconstrucc", "botanical"],
    products: ["Proteína 10 en 1", "Botanical"],
    hint: "reconstrucción proteica",
  },
  {
    id: "graso",
    keywords: ["graso", "grasa", "mixto", "raiz grasa", "raíz grasa", "sebo", "pesadez", "apelmaz"],
    products: ["Tentación Equilibrio", "Scalp Therapy", "Scrub Glow"],
    hint: "equilibrio raíz/puntas",
  },
  {
    id: "cuero",
    keywords: ["cuero cabelludo", "caspa", "detox", "acumulacion", "acumulación", "impureza", "exfolia", "scrub"],
    products: ["Scalp Therapy", "Scrub Glow", "Cepillo Masajeador Capilar", "Secreto de Primavera"],
    hint: "cuero cabelludo",
  },
  {
    id: "caida",
    keywords: ["caida", "caída", "alopecia", "anticaida", "crecimiento", "debilit", "quiebre", "densidad"],
    products: ["Shots", "Secreto de Primavera", "Cepillo Masajeador Capilar"],
    hint: "caída y crecimiento",
  },
  {
    id: "brillo",
    keywords: ["brillo", "shine", "gloss", "luminos", "acabado", "pulid"],
    products: ["Shine Gloss", "Bloom Shine", "Fantasía Natural"],
    hint: "brillo y acabado",
  },
  {
    id: "proteccion",
    keywords: ["sol", "playa", "piscina", "uv", "termoprot", "secador", "humedad", "bloqueador capilar"],
    products: ["Fantasía Natural", "Shine Gloss"],
    hint: "protección diaria",
  },
  {
    id: "puntas",
    keywords: ["puntas", "nocturno", "noche", "sos", "luna"],
    products: ["Luna Llena", "Shine Gloss", "Dulce Renacer"],
    hint: "puntas en emergencia",
  },
  {
    id: "bomba",
    keywords: ["bomba capilar", "pre shampoo", "preshampoo", "ritual", "tratamiento intensivo"],
    products: ["Dulce Renacer", "Sensación Primaveral"],
    hint: "bomba capilar",
  },
  {
    id: "rutina",
    keywords: ["rutina", "shampoo", "champu", "acondicionador", "lavado"],
    products: ["Tentación Nutrición", "Tentación Equilibrio", "Botanical", "Scalp Therapy"],
    hint: "rutina de lavado",
  },
  {
    id: "tonico",
    keywords: ["tonico", "tónico", "shots", "ampolla"],
    products: ["Secreto de Primavera", "Shots"],
    hint: "tónicos y shots",
  },
  {
    id: "fragancia",
    keywords: ["perfume", "fragancia", "olor", "aroma", "bruma"],
    products: ["Sweet Love", "Scarlette", "Golden Glow", "Suspiros", "Bloom Shine"],
    hint: "fragancia capilar",
  },
  {
    id: "tenido",
    keywords: ["tenido", "teñido", "color", "decolorado", "matiz"],
    products: ["Fantasía Natural", "Proteína 10 en 1", "Shine Gloss", "Dulce Renacer"],
    hint: "cabello teñido",
  },
];

export function detectJuliConcerns(query: string): typeof JULI_CONCERN_TRIGGERS {
  const n = fold(query);
  if (!n) return [];
  return JULI_CONCERN_TRIGGERS.filter((row) => row.keywords.some((k) => n.includes(fold(k))));
}

function productMatchesTriggerName(productName: string, catalogName: string): boolean {
  const a = normalizeMenuLookup(productName);
  const b = normalizeMenuLookup(catalogName);
  return a === b || a.includes(b) || b.includes(a);
}

/** Extra puntos cuando la consulta encaja con un producto del catálogo oficial. */
export function juliCatalogBoost(query: string, product: StoreProduct): number {
  const concerns = detectJuliConcerns(query);
  let score = 0;
  for (const row of concerns) {
    if (row.products.some((name) => productMatchesTriggerName(product.name, name))) {
      score += 14;
    }
  }
  const blob = getCatalogKnowledgeBlob(product.name);
  if (blob) {
    const n = fold(query);
    const foldedBlob = fold(blob);
    for (const token of n.split(/[\s,.;:!?¿¡/+-]+/).filter((t) => t.length >= 4)) {
      if (foldedBlob.includes(token)) score += 2;
    }
  }
  return score;
}

export function juliMatchHint(product: StoreProduct, query: string): string | null {
  const hit = detectJuliConcerns(query).find((row) =>
    row.products.some((name) => productMatchesTriggerName(product.name, name)),
  );
  if (hit) return hit.hint;
  const copy = getCatalogProductCopy(product.name);
  if (copy?.tagline) return copy.tagline;
  return null;
}

export function formatJuliCatalogLine(product: StoreProduct): string {
  const copy = getCatalogProductCopy(product.name);
  if (!copy) return "";
  const benefits = copy.benefits.slice(0, 3).join("; ");
  return [
    copy.tagline && `ficha: ${copy.tagline}`,
    copy.idealFor && `ideal: ${copy.idealFor}`,
    benefits && `beneficios: ${benefits}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const JULI_CATALOG_RULES = `Recomiendas SOLO productos Four Sensations de la tienda (nunca marcas ajenas).
Usa la ficha oficial: para quién es, beneficios y modo de uso.
Si piden bomba capilar, junta Dulce Renacer + Sensación Primaveral.
Si piden proteína o reconstrucción, lidera Proteína 10 en 1 con Botanical.
Si piden caída o crecimiento, lidera Shots y Secreto de Primavera.
Si piden frizz o brillo, Shine Gloss / Fantasía Natural / tratamientos nutritivos.
Invita a agregar al carrito o favoritos.
Políticas: despacho desde Manizales, máx. 2 días hábiles de preparación; no hay cambios por gusto (uso personal); sí garantía legal; novedades de transporte en 24 h.`;
