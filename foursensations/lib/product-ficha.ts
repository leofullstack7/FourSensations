import { getCatalogProductCopy } from "@/lib/catalog-product-copy";
import { getProductDisplayName } from "@/lib/product-display-names";

/** Textos de la ficha pública que no viven en las columnas sueltas del producto. */
export type ProductFichaCopy = {
  title: string;
  subtitle: string;
  tagline: string;
  hook: string;
  description: string;
  idealFor: string;
  benefits: string[];
  howTo: string;
  content: string;
};

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function normalizeProductFicha(raw: unknown): ProductFichaCopy | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const benefits = Array.isArray(row.benefits)
    ? row.benefits.map((item) => text(item, 200)).filter(Boolean).slice(0, 8)
    : [];
  const ficha: ProductFichaCopy = {
    title: text(row.title, 200),
    subtitle: text(row.subtitle, 200),
    tagline: text(row.tagline, 160),
    hook: text(row.hook, 400),
    description: text(row.description, 20_000),
    idealFor: text(row.idealFor, 400),
    benefits,
    howTo: text(row.howTo, 2000),
    content: text(row.content, 200),
  };
  const hasText = Object.values(ficha).some((value) => (Array.isArray(value) ? value.length > 0 : value.length > 0));
  return hasText ? ficha : null;
}

export function normalizeProductFichaMap(raw: unknown): Record<string, ProductFichaCopy> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, ProductFichaCopy> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = id.trim();
    if (!key) continue;
    const ficha = normalizeProductFicha(value);
    if (ficha) out[key] = ficha;
  }
  return out;
}

/** Valores iniciales del editor, iguales a lo que ve la clienta si aún no hay override. */
export function seedProductFicha(name: string, description: string, subcategory: string, saved?: ProductFichaCopy | null): ProductFichaCopy {
  const catalog = getCatalogProductCopy(name);
  const display = getProductDisplayName(name);
  const base: ProductFichaCopy = {
    title: display.title || name,
    subtitle: display.subtitle,
    tagline: catalog?.tagline || subcategory || "",
    hook: catalog?.hook || "",
    description: catalog?.description || description || "",
    idealFor: catalog?.idealFor || "",
    benefits: (catalog?.benefits ?? []).slice(0, 6),
    howTo: catalog?.howTo || "",
    content: catalog?.content || "",
  };
  if (!saved) return base;
  return {
    title: saved.title || base.title,
    subtitle: saved.subtitle,
    tagline: saved.tagline,
    hook: saved.hook,
    description: saved.description || base.description,
    idealFor: saved.idealFor,
    benefits: saved.benefits,
    howTo: saved.howTo,
    content: saved.content,
  };
}
