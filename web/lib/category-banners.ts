/** Banners hero por slug de categoría (public/categorias/banners). */
export const CATEGORY_LANDING_BANNERS: Record<string, string> = {
  maquillaje: "/categorias/banners/maquillaje.webp",
  "cuidado-piel": "/categorias/banners/cuidado-piel.webp",
  "cuidado-capilar": "/categorias/banners/cuidado-capilar.webp",
  unas: "/categorias/banners/unas.webp",
  hombres: "/categorias/banners/hombres.webp",
  accesorios: "/categorias/banners/accesorios.webp",
};

export function getCategoryLandingBanner(slug: string): string | null {
  return CATEGORY_LANDING_BANNERS[slug] ?? null;
}
