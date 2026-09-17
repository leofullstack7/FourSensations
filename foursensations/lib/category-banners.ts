/** Banners hero por slug de categoría (public/categorias/banners). */
export const CATEGORY_LANDING_BANNERS: Record<string, string> = {
  maquillaje: "/categorias/banners/maquillaje.webp",
  "cuidado-piel": "/categorias/banners/cuidado-piel.webp",
  "cuidado-capilar": "/categorias/banners/cuidado-capilar.webp",
  unas: "/categorias/banners/unas.webp",
  hombres: "/categorias/banners/hombres.webp",
  accesorios: "/categorias/banners/accesorios.webp",
};

/** Fondos claros (rosados/pasteles) vs oscuros: define contraste del copy. */
export const CATEGORY_LANDING_BANNER_TONES: Record<string, "light" | "dark"> = {
  maquillaje: "light",
  "cuidado-piel": "light",
  "cuidado-capilar": "light",
  unas: "light",
  accesorios: "light",
  hombres: "dark",
};

export function getCategoryLandingBanner(slug: string): string | null {
  return CATEGORY_LANDING_BANNERS[slug] ?? null;
}

export function getCategoryLandingBannerTone(slug: string): "light" | "dark" | null {
  return CATEGORY_LANDING_BANNER_TONES[slug] ?? null;
}
