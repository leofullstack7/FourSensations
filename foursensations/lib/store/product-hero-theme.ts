export const PRODUCT_HERO_THEMES = ["peach", "sage", "blush", "lavender", "gold"] as const;

export type ProductHeroTheme = (typeof PRODUCT_HERO_THEMES)[number];

/** Paleta de la marca: amarillo (peach), verde pastel (sage), blush, lavanda, oro. */
export function productHeroThemeFromSlug(slug: string): ProductHeroTheme {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return PRODUCT_HERO_THEMES[hash % PRODUCT_HERO_THEMES.length] ?? "sage";
}
