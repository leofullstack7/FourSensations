import { normalizeKey } from "./normalize";

/** Slug esperado de la categoría Tintes en el árbol de la tienda. */
export const TINTES_CATEGORY_SLUG = "tintes";

/** Etiquetas de columna Categoría que sí indican tintes en el CSV del proveedor. */
export function csvCategoryLabelIsTintes(category: string | null | undefined): boolean {
  const raw = category?.trim();
  if (!raw) return false;
  const k = normalizeKey(raw);
  return (
    k === TINTES_CATEGORY_SLUG ||
    k === "tinte" ||
    k === "coloracion" ||
    k === "coloración" ||
    k === "coloracion capilar" ||
    k === "coloración capilar"
  );
}

/**
 * El CSV trae un valor en Categoría que no es tintes (p. ej. «Sin categoría web», «Maquillaje»).
 * En ese caso nunca se debe inferir ni tratar la fila como tinte.
 */
export function csvHasExplicitNonTintesCategory(category: string | null | undefined): boolean {
  const raw = category?.trim();
  if (!raw) return false;
  return !csvCategoryLabelIsTintes(raw);
}

/** Columnas dedicadas de tinte en el CSV (no cuenta Marca genérica). */
export function rowHasDedicatedTintCsvColumns(mapped: {
  tintLevel?: string | null;
  tintType?: string | null;
  tintFamily?: string | null;
}): boolean {
  return Boolean(
    mapped.tintLevel?.trim() || mapped.tintType?.trim() || mapped.tintFamily?.trim()
  );
}

/**
 * Fila que realmente pertenece al flujo Tintes en carga masiva
 * (categoría tintes + CSV sin otra categoría explícita).
 */
export function bulkPreviewRowIsTintes(row: {
  mapped: { category?: string | null; categorySlug?: string | null };
}): boolean {
  if (!isTintesCategory(row.mapped.categorySlug)) return false;
  if (csvHasExplicitNonTintesCategory(row.mapped.category)) return false;
  return true;
}

/**
 * Clave normalizada para emparejar columna «Nivel» del CSV con el nombre del archivo en el ZIP.
 * Conserva guiones; unifica coma/punto decimal para tolerar variantes (9,5-1 ↔ 9.5-1).
 * Sufijos de variante en imágenes (p. ej. 1-0_color.webp, 5-0_1.webp) se ignoran → misma clave que 1-0 / 5-0.
 */
export function normalizeTintLevelKey(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let s = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  // Variante muestra de color: 1-0_color, 5-6-color → mismo nivel que 1-0, 5-6.
  s = s.replace(/[-_]color$/i, "");
  // Segunda/tercera foto del mismo nivel: 5-0_1, 7-12_2 (solo guion bajo + dígitos; no tocar 5-12).
  s = s.replace(/_\d+$/i, "");
  // Por si venía 5-0_1_color (color ya quitado arriba) u otro orden raro.
  s = s.replace(/[-_]color$/i, "");
  s = s.replace(/_\d+$/i, "");
  s = s.replace(/\s+/g, "");
  s = s.replace(/_/g, "");
  // Unificar decimal europeo: 9,5-1 y 9.5-1 → 9.5-1
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
