/**
 * Formato de nombres de categoría/subcategoría para la tienda:
 * MAYÚSCULAS SOSTENIDAS → solo mayúscula inicial (resto minúsculas).
 */

/** Detecta texto en mayúsculas sostenidas (p. ej. CUIDADO FACIAL, LABIAL). */
export function isAllCapsTaxonomyText(text: string): boolean {
  const letters = text.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, "");
  if (letters.length < 1) return false;
  const upper = letters.toUpperCase();
  const lower = letters.toLowerCase();
  if (upper === lower) return false;
  return letters === upper;
}

/** "CUIDADO FACIAL" → "Cuidado facial"; "MAQUILLAJE / OJOS" → "Maquillaje / ojos". */
export function formatTaxonomyDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed
    .split(/\s*\/\s*/)
    .map((part) => {
      const p = part.trim();
      if (!p) return "";
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(" / ");
}

/**
 * Nombre persistido en DB: si viene en MAYÚSCULAS, lo formatea;
 * si ya tiene capitalización mixta, lo deja igual (solo trim).
 */
export function normalizeTaxonomyNameForDb(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  if (isAllCapsTaxonomyText(trimmed)) return formatTaxonomyDisplayName(trimmed);
  return trimmed;
}
