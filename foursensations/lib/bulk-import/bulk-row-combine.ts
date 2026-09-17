import type { BulkPreviewResult, BulkPreviewRow } from "./build-preview";
import { bulkImportStableRowId } from "./bulk-import-row-id";
import { canonicalVariantGroupCode } from "./variant-group-code";
import { effectiveProductTitle } from "./semantic-map";

export type BulkRowCombineSpec = {
  survivorPreviewRowId: string;
  absorbedPreviewRowIds: string[];
  name: string;
};

export type BulkCombineValidation =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * No se pueden combinar filas que ya pertenecen a grupos de barras distintos.
 * (Sin barras o todas con el mismo código → OK.)
 */
export function validateBulkRowCombine(rows: BulkPreviewRow[]): BulkCombineValidation {
  if (rows.length < 2) {
    return { ok: false, reason: "Selecciona al menos 2 productos para combinar." };
  }
  for (const r of rows) {
    if (r.isExistingProduct) {
      return {
        ok: false,
        reason: "Solo se pueden combinar productos nuevos (aún no registrados en tienda).",
      };
    }
  }
  const groupKeys = new Set<string>();
  const groupLabels: string[] = [];
  for (const r of rows) {
    const raw = r.mapped.variantGroupCode?.trim();
    if (!raw) continue;
    const key = canonicalVariantGroupCode(raw);
    if (!key) continue;
    if (!groupKeys.has(key)) {
      groupKeys.add(key);
      groupLabels.push(raw);
    }
  }
  if (groupKeys.size > 1) {
    return {
      ok: false,
      reason: `No se pueden combinar: son variantes de grupos de barras distintos (${groupLabels.join(
        " · "
      )}). Combina solo códigos del mismo producto, o quita la selección de otros grupos.`,
    };
  }
  return { ok: true };
}

function mergeImageMatches(target: BulkPreviewRow, sources: BulkPreviewRow[]): void {
  const seen = new Set(target.imageMatches.map((m) => m.imageFilename));
  for (const src of sources) {
    for (const m of src.imageMatches) {
      if (seen.has(m.imageFilename)) continue;
      if (
        m.matchedBy === "exact" ||
        m.matchedBy === "numericPrefix" ||
        m.matchedBy === "sixDigitPrefix" ||
        m.matchedBy === "tintLevel" ||
        m.matchedBy === "fuzzy"
      ) {
        target.imageMatches.push({ ...m });
        target.imageFileNames.push(m.imageFilename);
        seen.add(m.imageFilename);
      }
    }
  }
  target.issues = target.issues.filter(
    (x) =>
      x !== "Sin imagen en ZIP para este código" &&
      x !== "Sin imagen en ZIP para este nivel" &&
      !x.startsWith("Combinado en")
  );
}

/**
 * Aplica combinaciones persistidas: fusiona fotos en el sobreviviente y omite los absorbidos.
 */
export function applyBulkRowCombines(
  preview: BulkPreviewResult,
  combines: BulkRowCombineSpec[] | undefined | null
): void {
  if (!combines || combines.length === 0) {
    preview.rowCombines = [];
    return;
  }

  const byId = new Map(preview.rows.map((r) => [bulkImportStableRowId(r), r]));
  const applied: BulkRowCombineSpec[] = [];

  for (const spec of combines) {
    const survivor = byId.get(spec.survivorPreviewRowId);
    if (!survivor) continue;
    const absorbed = spec.absorbedPreviewRowIds
      .map((id) => byId.get(id))
      .filter((r): r is BulkPreviewRow => !!r && r !== survivor);
    if (absorbed.length === 0) continue;

    const check = validateBulkRowCombine([survivor, ...absorbed]);
    if (!check.ok) continue;

    const name = spec.name.trim() || effectiveProductTitle(survivor.mapped) || survivor.mapped.name || "Producto";
    mergeImageMatches(survivor, absorbed);
    survivor.mapped.name = name;
    survivor.selected = true;

    const combineMsg = `Combinado en «${name}»`;
    for (const row of absorbed) {
      row.imageMatches = [];
      row.imageFileNames = [];
      row.selected = false;
      if (!row.issues.includes(combineMsg)) row.issues.push(combineMsg);
      if (!row.issues.includes("Omitido: combinado en otro producto")) {
        row.issues.push("Omitido: combinado en otro producto");
      }
    }

    applied.push({
      survivorPreviewRowId: spec.survivorPreviewRowId,
      absorbedPreviewRowIds: absorbed.map((r) => bulkImportStableRowId(r)),
      name,
    });
  }

  preview.rowCombines = applied;

  // Recalcular listas derivadas
  const hasGoodMatch = (r: BulkPreviewRow) =>
    r.imageMatches.some(
      (m) =>
        m.matchedBy === "exact" ||
        m.matchedBy === "numericPrefix" ||
        m.matchedBy === "sixDigitPrefix" ||
        m.matchedBy === "tintLevel" ||
        m.matchedBy === "fuzzy"
    );

  preview.matchedRows = preview.rows.filter(hasGoodMatch);
  preview.unmatchedRows = preview.rows.filter((r) => !hasGoodMatch(r));
  preview.stats.rowsWithImage = preview.matchedRows.length;
  preview.stats.rowsWithoutImage = preview.rows.length - preview.matchedRows.length;
}
