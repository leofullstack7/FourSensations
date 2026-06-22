import { normalizeKey } from "./normalize";

/** Slug esperado de la categoría Tintes en el árbol de la tienda. */
export const TINTES_CATEGORY_SLUG = "tintes";

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
