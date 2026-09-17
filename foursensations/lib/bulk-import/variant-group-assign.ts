import type { BulkPreviewRow } from "./build-preview";
import { normalizeColorHex } from "@/lib/product-color";
import { variantGroupCodesMatch } from "./variant-group-code";

/** Política para filas cuyo código ya existe en tienda. */
export type BulkExistingPolicy = "skip" | "replace" | "omit";

/** Producto ya en tienda y con el mismo código Barras del CSV (nada que agrupar). */
export function bulkRowIsAlreadyVariantGrouped(row: BulkPreviewRow): boolean {
  if (!row.isExistingProduct) return false;
  return variantGroupCodesMatch(row.mapped.variantGroupCode, row.existingVariantGroupCode);
}

/** Fila existente en tienda a la que solo se asignará código de barras / orden de variante. */
export function bulkRowIsVariantGroupAssign(
  row: BulkPreviewRow,
  existingPolicy: BulkExistingPolicy
): boolean {
  return (
    existingPolicy === "skip" &&
    row.isExistingProduct === true &&
    !!row.normalizedCode &&
    (!!row.mapped.variantGroupCode?.trim() || !!normalizeColorHex(row.mapped.colorHex))
  );
}

/** Issues que no bloquean cuando solo se agrupa un producto ya registrado. */
export function isIssueIgnorableForVariantGroupAssign(
  issue: string,
  row: BulkPreviewRow,
  existingPolicy: BulkExistingPolicy
): boolean {
  if (!bulkRowIsVariantGroupAssign(row, existingPolicy)) return false;
  if (issue.startsWith("Aviso:")) return true;
  if (
    issue === "Sin imagen en ZIP para este código" ||
    issue === "Sin imagen en ZIP para este nivel" ||
    issue === "Producto ya registrado" ||
    issue === "Código de barras distinto al registrado en tienda" ||
    issue === "Falta categoría" ||
    issue === "Falta subcategoría" ||
    issue === "Falta nombre" ||
    issue === "Precio inválido o vacío" ||
    issue === "Stock inválido" ||
    issue === "Categoría no reconocida" ||
    issue === "Subcategoría CSV no reconocida en la categoría detectada"
  ) {
    return true;
  }
  if (issue.startsWith("Categoría CSV")) return true;
  if (
    issue === "Selecciona tipo y familia de tinte para importar" ||
    issue === "Selecciona un tipo de tinte para importar" ||
    issue === "Falta tipo de tinte en el CSV"
  ) {
    return true;
  }
  if (issue.startsWith("Familia sin resolver") || issue.startsWith("Tipo sin resolver")) return true;
  return false;
}

/** Con «omitir» no se toca el producto: cualquier issue de la fila existente deja de bloquear. */
export function isIssueIgnorableForOmit(
  issue: string,
  row: BulkPreviewRow,
  existingPolicy: BulkExistingPolicy
): boolean {
  if (existingPolicy !== "omit" || row.isExistingProduct !== true) return false;
  void issue;
  return true;
}

/** Con «reemplazar» / actualizar, el aviso de ya registrado no bloquea. */
export function isIssueIgnorableForReplace(
  issue: string,
  row: BulkPreviewRow,
  existingPolicy: BulkExistingPolicy
): boolean {
  if (existingPolicy !== "replace" || row.isExistingProduct !== true) return false;
  if (
    issue === "Producto ya registrado" ||
    issue === "Sin imagen en ZIP para este código" ||
    issue === "Sin imagen en ZIP para este nivel" ||
    issue === "Código de barras distinto al registrado en tienda" ||
    issue.startsWith("Aviso:")
  ) {
    return true;
  }
  // CSV-only / actualizar: un código repetido no impide actualizar UNA fila;
  // el commit ya rechaza si hay dos seleccionadas con el mismo código.
  if (issue === "Código duplicado en el CSV" || issue === "Nivel duplicado en el CSV") {
    return true;
  }
  // Sin fotos en el ZIP no hay match que resolver.
  if (issue === "Match ambiguo con imágenes" && !row.imageMatches.some((m) => m.matchedBy !== "none" && m.matchedBy !== "ambiguous")) {
    return true;
  }
  return false;
}

export function bulkRowBlockingIssues(
  row: BulkPreviewRow,
  existingPolicy: BulkExistingPolicy
): string[] {
  return row.issues.filter(
    (issue) =>
      !isIssueIgnorableForVariantGroupAssign(issue, row, existingPolicy) &&
      !isIssueIgnorableForOmit(issue, row, existingPolicy) &&
      !isIssueIgnorableForReplace(issue, row, existingPolicy)
  );
}

export function bulkRowIsReadyForVariantGroupAssign(
  row: BulkPreviewRow,
  existingPolicy: BulkExistingPolicy
): boolean {
  if (bulkRowIsAlreadyVariantGrouped(row)) return false;
  return bulkRowIsVariantGroupAssign(row, existingPolicy) && bulkRowBlockingIssues(row, existingPolicy).length === 0;
}
