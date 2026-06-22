import type { StoreProduct } from "@/lib/types/product";

/** Suma puntos por atributos que resaltan en la grilla del home. */
export function productHighlightScore(p: StoreProduct): number {
  let score = 0;
  if (p.featuredInHome) score += 100;
  if (p.badge === "best" || p.badge === "hot") score += 40;
  else if (p.badge === "new" || p.badge === "sale") score += 28;
  if (p.isNew) score += 22;
  if (p.originalPrice != null && p.originalPrice > p.price) score += 18;
  if (p.rating >= 4.8 && p.reviews >= 50) score += 12;
  else if (p.rating >= 4.5 && p.reviews >= 20) score += 6;
  if (p.reviews >= 120) score += 5;
  return score;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Orden del home (vista por defecto): primero productos con más atributos destacados,
 * mezclados de forma pseudoaleatoria (no por fecha de creación).
 * La semilla rota cada día para variedad sin saltos en cada render.
 */
export function sortProductsForHomeDisplay(
  products: StoreProduct[],
  seed = new Date().toISOString().slice(0, 10)
): StoreProduct[] {
  return [...products].sort((a, b) => {
    const scoreA = productHighlightScore(a);
    const scoreB = productHighlightScore(b);
    if (scoreA !== scoreB) return scoreB - scoreA;
    const jitterA = hashString(`${seed}:${a.id}`);
    const jitterB = hashString(`${seed}:${b.id}`);
    return jitterA - jitterB;
  });
}
