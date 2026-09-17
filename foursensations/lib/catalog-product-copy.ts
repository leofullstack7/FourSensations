import catalogJson from "@/lib/catalog-product-copy.json";
import { normalizeMenuLookup } from "@/lib/store/menu-item-href";

export type CatalogProductCopy = {
  tagline: string;
  hook: string;
  description: string;
  idealFor: string;
  benefits: string[];
  howTo: string;
  content: string;
  pricePublicHint?: string;
};

type CatalogFileEntry = CatalogProductCopy & { aliases?: string[] };

const SOURCE = catalogJson as Record<string, CatalogFileEntry>;

const INDEX = (() => {
  const map = new Map<string, CatalogProductCopy>();
  for (const [name, entry] of Object.entries(SOURCE)) {
    const { aliases, ...copy } = entry;
    map.set(normalizeMenuLookup(name), copy);
    for (const alias of aliases ?? []) {
      map.set(normalizeMenuLookup(alias), copy);
    }
  }
  return map;
})();

export function getCatalogProductCopy(name: string): CatalogProductCopy | null {
  return INDEX.get(normalizeMenuLookup(name)) ?? null;
}

/** Texto plano del catálogo oficial para el motor de Juli AI. */
export function getCatalogKnowledgeBlob(name: string): string {
  const copy = getCatalogProductCopy(name);
  if (!copy) return "";
  return [
    copy.tagline,
    copy.hook,
    copy.description,
    copy.idealFor,
    copy.benefits.join(" "),
    copy.howTo,
    copy.content,
  ]
    .filter(Boolean)
    .join(" ");
}

export function listCatalogProductNames(): string[] {
  return Object.keys(SOURCE);
}
