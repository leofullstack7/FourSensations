import { slugify } from "@/lib/slugify";

/** «IGORA ROYAL» → «Igora royal» (primera mayúscula, resto minúsculas). */
export function formatBrandDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function brandSlugFromName(name: string): string {
  return slugify(formatBrandDisplayName(name) || name);
}

export type StoreBrandListItem = {
  name: string;
  displayName: string;
  slug: string;
  productCount: number;
};

export function getBrandLandingCopy(displayName: string) {
  return {
    headline: `${displayName}: calidad que se nota`,
    subtitle:
      "Explora el catálogo de esta marca, filtra por categoría y encuentra exactamente lo que buscas.",
    ctaExplore: "Ver toda la marca",
    ctaBack: "← Volver al home",
  };
}
