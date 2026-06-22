import type { BulkPreviewResult, BulkPreviewRow } from "./build-preview";
import { normalizeTaxonomyNameForDb } from "./category-resolve";
import { isTintesCategory } from "./tintes";
import { bulkImportStableRowId } from "./bulk-import-row-id";

export type TintCatalogEntry = { id: string; name: string };

/** Nombre de catálogo Tintes: siempre MAYÚSCULAS. */
export function normalizeTintCatalogName(raw: string): string {
  return normalizeTaxonomyNameForDb(raw);
}

export type TintCatalogState = {
  existingTintFamilies: TintCatalogEntry[];
  existingTintTypes: TintCatalogEntry[];
  tintFamilyLinks: Record<string, string>;
  tintTypeLinks: Record<string, string>;
  tintRowSelections: Record<string, { tintFamilyId: string; tintTypeId: string }>;
};

function catalogNameKey(name: string): string {
  return normalizeTintCatalogName(name);
}

function findIdByCatalogName(name: string, catalog: TintCatalogEntry[]): string | null {
  const key = catalogNameKey(name);
  const hit = catalog.find((c) => catalogNameKey(c.name) === key);
  return hit?.id ?? null;
}

function collectUniqueCsvTintValues(rows: BulkPreviewRow[], field: "tintFamily" | "tintType"): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    if (!isTintesCategory(r.mapped.categorySlug)) continue;
    const raw = (r.mapped[field] ?? "").trim();
    if (!raw) continue;
    const key = catalogNameKey(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function isCsvValueResolved(
  csvKey: string,
  catalog: TintCatalogEntry[],
  links: Record<string, string>
): boolean {
  if (links[csvKey]) return true;
  return findIdByCatalogName(csvKey, catalog) != null;
}

function computeNewCatalogValues(
  csvValues: string[],
  catalog: TintCatalogEntry[],
  links: Record<string, string>
): string[] {
  return csvValues.filter((v) => !isCsvValueResolved(v, catalog, links));
}

function resolveTintIdForRow(
  row: BulkPreviewRow,
  field: "tintFamily" | "tintType",
  catalog: TintCatalogEntry[],
  links: Record<string, string>,
  rowSelections: Record<string, { tintFamilyId: string; tintTypeId: string }>
): string | null {
  const rowId = bulkImportStableRowId(row);
  const manual = rowSelections[rowId];
  if (field === "tintFamily" && manual?.tintFamilyId) return manual.tintFamilyId;
  if (field === "tintType" && manual?.tintTypeId) return manual.tintTypeId;

  const raw = (row.mapped[field] ?? "").trim();
  if (!raw) return null;

  const csvKey = catalogNameKey(raw);
  const linked = links[csvKey];
  if (linked) return linked;

  return findIdByCatalogName(csvKey, catalog);
}

/**
 * Enriquece el preview con listas de catálogo Tintes, resuelve IDs por fila
 * y marca issues si Familia/Tipo del CSV no tienen id asignado.
 */
export function applyTintCatalogToPreview(
  preview: BulkPreviewResult,
  state: TintCatalogState
): BulkPreviewResult {
  const {
    existingTintFamilies,
    existingTintTypes,
    tintFamilyLinks,
    tintTypeLinks,
    tintRowSelections,
  } = state;

  const allRows = preview.rows;
  const csvFamilies = collectUniqueCsvTintValues(allRows, "tintFamily");
  const csvTypes = collectUniqueCsvTintValues(allRows, "tintType");

  const newTintFamilies = computeNewCatalogValues(csvFamilies, existingTintFamilies, tintFamilyLinks);
  const newTintTypes = computeNewCatalogValues(csvTypes, existingTintTypes, tintTypeLinks);

  const tintCatalogResolved = newTintFamilies.length === 0 && newTintTypes.length === 0;

  const applyToRow = (r: BulkPreviewRow) => {
    if (!isTintesCategory(r.mapped.categorySlug)) {
      r.tintFamilyId = null;
      r.tintTypeId = null;
      return;
    }

    const familyId = resolveTintIdForRow(r, "tintFamily", existingTintFamilies, tintFamilyLinks, tintRowSelections);
    const typeId = resolveTintIdForRow(r, "tintType", existingTintTypes, tintTypeLinks, tintRowSelections);
    r.tintFamilyId = familyId;
    r.tintTypeId = typeId;

    const stripIssue = (prefix: string) => {
      r.issues = r.issues.filter((x) => !x.startsWith(prefix));
    };

    if (r.mapped.tintFamily?.trim()) {
      if (!familyId) {
        stripIssue("Familia sin resolver");
        r.issues.push("Familia sin resolver");
      } else {
        stripIssue("Familia sin resolver");
      }
    }
    if (r.mapped.tintType?.trim()) {
      if (!typeId) {
        stripIssue("Tipo sin resolver");
        r.issues.push("Tipo sin resolver");
      } else {
        stripIssue("Tipo sin resolver");
      }
    }
  };

  for (const r of preview.rows) applyToRow(r);
  for (const r of preview.matchedRows) applyToRow(r);
  for (const r of preview.unmatchedRows) applyToRow(r);
  for (const r of preview.ambiguousRows) applyToRow(r);

  return {
    ...preview,
    existingTintFamilies,
    existingTintTypes,
    newTintFamilies,
    newTintTypes,
    tintFamilyLinks,
    tintTypeLinks,
    tintRowSelections,
    tintCatalogResolved,
  };
}

export function readTintCatalogStateFromPreview(preview: BulkPreviewResult | null): TintCatalogState {
  if (!preview) {
    return {
      existingTintFamilies: [],
      existingTintTypes: [],
      tintFamilyLinks: {},
      tintTypeLinks: {},
      tintRowSelections: {},
    };
  }
  return {
    existingTintFamilies: preview.existingTintFamilies ?? [],
    existingTintTypes: preview.existingTintTypes ?? [],
    tintFamilyLinks: preview.tintFamilyLinks ?? {},
    tintTypeLinks: preview.tintTypeLinks ?? {},
    tintRowSelections: preview.tintRowSelections ?? {},
  };
}
