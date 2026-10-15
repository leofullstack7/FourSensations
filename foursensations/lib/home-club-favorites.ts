/**
 * Productos “Favoritos del Club” en el home.
 * Matching por nombre (case-insensitive, sin acentos).
 */
export const HOME_CLUB_FAVORITE_NAMES: readonly string[] = [
  "Bomba Capilar",
  "Fantasía Natural",
  "Bloqueador Capilar",
  "Shine Gloss",
  "Botanical",
  "Scrub Glow",
  "Bloom Shine",
  "BloomShine",
  "Sweet Love",
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

export function homeClubFavoriteRank(name: string): number {
  const key = normalizeProductKey(name);
  return HOME_CLUB_FAVORITE_NAMES.findIndex((fav) => {
    const listed = normalizeProductKey(fav);
    return key === listed || key.includes(listed);
  });
}

export function isHomeClubFavoriteProduct(name: string): boolean {
  return homeClubFavoriteRank(name) >= 0;
}
