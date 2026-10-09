import { normalizeMenuLookup } from "@/lib/store/menu-item-href";
import { getCatalogProductCopy } from "@/lib/catalog-product-copy";

export type StorefrontProductTitle = {
  title: string;
  subtitle: string;
};

const DISPLAY_BY_KEY: Record<string, StorefrontProductTitle> = {
  "dulce renacer": { title: "Dulce Renacer", subtitle: "Tratamiento Capilar Nutritivo" },
  "sensacion primaveral": { title: "Sensación Primaveral", subtitle: "Repolarizador Capilar" },
  "proteina 10 en 1": { title: "Proteína Capilar", subtitle: "10 en 1" },
  "proteina capilar": { title: "Proteína Capilar", subtitle: "10 en 1" },
  "proteina capilar 10 en 1": { title: "Proteína Capilar", subtitle: "10 en 1" },
  botanical: { title: "Botanical", subtitle: "Shampoo" },
  "shampoo botanical": { title: "Botanical", subtitle: "Shampoo" },
  "tentacion equilibrio": { title: "Kit Tentación Equilibrio", subtitle: "Shampoo & Acondicionador Cebolla" },
  "kit tentacion equilibrio": { title: "Kit Tentación Equilibrio", subtitle: "Shampoo & Acondicionador Cebolla" },
  "tentacion nutricion": { title: "Kit Tentación Nutrición", subtitle: "Shampoo & Acondicionador Aguacate" },
  "kit tentacion nutricion": { title: "Kit Tentación Nutrición", subtitle: "Shampoo & Acondicionador Aguacate" },
  "scalp therapy": { title: "Kit Scalp Therapy", subtitle: "Shampoo & Acondicionador Carbón Activado" },
  "kit scalp therapy": { title: "Kit Scalp Therapy", subtitle: "Shampoo & Acondicionador Carbón Activado" },
  "secreto de primavera": { title: "Secreto de Primavera", subtitle: "Tónico Capilar" },
  shots: { title: "Shots Capilares", subtitle: "Anticaída • Reparación • Crecimiento" },
  "shots capilares": { title: "Shots Capilares", subtitle: "Anticaída • Reparación • Crecimiento" },
  "shots x3": { title: "Shots Capilares", subtitle: "Anticaída • Reparación • Crecimiento" },
  "scrub glow": { title: "Scrub Glow", subtitle: "Exfoliante Capilar" },
  "cepillo masajeador capilar": { title: "Cepillo", subtitle: "Masajeador Capilar" },
  cepillo: { title: "Cepillo", subtitle: "Masajeador Capilar" },
  "fantasia natural": { title: "Fantasía Natural", subtitle: "Bloqueador Capilar" },
  "shine gloss": { title: "Shine Gloss", subtitle: "Óleo Capilar" },
  "sweet love": { title: "Sweet Love", subtitle: "Perfume Capilar" },
  "bloom shine": { title: "BloomShine", subtitle: "Perfume Capilar" },
  bloomshine: { title: "BloomShine", subtitle: "Perfume Capilar" },
  scarlette: { title: "Scarlette", subtitle: "Perfume Capilar" },
  "golden glow": { title: "Golden Glow", subtitle: "Perfume Capilar" },
  "luna llena": { title: "Luna Llena", subtitle: "Suero Capilar" },
  suspiros: { title: "Suspiros", subtitle: "Aceite Multipropósito" },
  "bomba capilar": { title: "Bomba Capilar", subtitle: "Dulce Renacer + Repolarizador Capilar" },
};

export function getStorefrontProductTitle(name: string): StorefrontProductTitle {
  const key = normalizeMenuLookup(name);
  if (DISPLAY_BY_KEY[key]) return DISPLAY_BY_KEY[key];
  for (const [alias, display] of Object.entries(DISPLAY_BY_KEY)) {
    if (key.includes(alias) || alias.includes(key)) return display;
  }
  const copy = getCatalogProductCopy(name);
  return {
    title: name,
    subtitle: copy?.tagline?.trim() || "",
  };
}
