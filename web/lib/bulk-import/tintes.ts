import { normalizeKey } from "./normalize";

/** Slug esperado de la categoría Tintes en el árbol de la tienda. */
export const TINTES_CATEGORY_SLUG = "tintes";

/**
 * Clave normalizada para emparejar columna «Nivel» del CSV con el nombre del archivo en el ZIP.
 * Conserva guiones; unifica coma/punto decimal para tolerar variantes (9,5-1 ↔ 9.5-1).
 */
export function normalizeTintLevelKey(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let s = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\s+/g, "");
  s = s.replace(/[._]/g, "");
  s = s.replace(/,/g, ".");
  return s || null;
}

/**
 * Indica si la fila pertenece a la categoría Tintes (por slug o nombre en el árbol).
 * Usado en preview e importación masiva para columnas/atributos específicos.
 */
export function isTintesCategory(
  categorySlug: string | null | undefined,
  categoryDisplayName?: string | null
): boolean {
  if (categorySlug && normalizeKey(categorySlug) === TINTES_CATEGORY_SLUG) return true;
  if (categoryDisplayName && normalizeKey(categoryDisplayName) === TINTES_CATEGORY_SLUG) return true;
  return false;
}

/** Familia de tinte en CSV: columna «Familia» o, si falta, «Marca» (mismo concepto en catálogo). */
export function effectiveTintFamily(mapped: {
  tintFamily?: string | null;
  brand?: string | null;
}): string | null {
  const fromFamily = mapped.tintFamily?.trim();
  if (fromFamily) return fromFamily;
  const fromBrand = mapped.brand?.trim();
  return fromBrand || null;
}
