import type { BulkPreviewRow } from "./build-preview";
import { normalizeColorHex } from "@/lib/product-color";

/** Fila existente en tienda a la que solo se asignará código de barras / orden de variante. */
export function bulkRowIsVariantGroupAssign(
  row: BulkPreviewRow,
  existingPolicy: "skip" | "replace"
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
  existingPolicy: "skip" | "replace"
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

export function bulkRowBlockingIssues(
  row: BulkPreviewRow,
  existingPolicy: "skip" | "replace"
): string[] {
  return row.issues.filter(
    (issue) => !isIssueIgnorableForVariantGroupAssign(issue, row, existingPolicy)
  );
}

export function bulkRowIsReadyForVariantGroupAssign(
  row: BulkPreviewRow,
  existingPolicy: "skip" | "replace"
): boolean {
  return bulkRowIsVariantGroupAssign(row, existingPolicy) && bulkRowBlockingIssues(row, existingPolicy).length === 0;
}
