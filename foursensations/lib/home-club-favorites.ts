/**
 * Productos “Favoritos del Club” en el home (guía 09).
 * Matching por nombre (case-insensitive, sin acentos).
 */
export const HOME_CLUB_FAVORITE_NAMES: readonly string[] = [
  "Bomba Capilar",
  "Fantasía Natural",
  "Shine Gloss",
  "Botanical",
  "Scrub Glow",
  "Sweet Love",
  "Bloom Shine",
  "BloomShine",
  "Scarlette",
  "Golden Glow",
];

function normalizeProductKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function isHomeClubFavoriteProduct(name: string): boolean {
  const key = normalizeProductKey(name);
  return HOME_CLUB_FAVORITE_NAMES.some((fav) => {
    const f = normalizeProductKey(fav);
    return key === f || key.includes(f) || f.includes(key);
  });
}
