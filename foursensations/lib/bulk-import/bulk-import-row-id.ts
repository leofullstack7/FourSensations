/**
 * Id estable por fila del preview de importación.
 * Vive en un módulo sin `adm-zip` / `fs` para poder importarse desde componentes cliente.
 */
export type BulkImportRowIdInput = {
  previewRowId?: string | null;
  rowId?: string | null;
  rowIndex: number;
};

export function bulkImportStableRowId(r: BulkImportRowIdInput): string {
  const raw = r.previewRowId ?? r.rowId;
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (raw != null && String(raw).length > 0) return String(raw);
  return `row-${r.rowIndex}`;
}
