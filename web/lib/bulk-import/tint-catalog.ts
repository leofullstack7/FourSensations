import type { BulkPreviewResult, BulkPreviewRow } from "./build-preview";
import { normalizeTaxonomyNameForDb } from "./category-resolve";
import { isTintesCategory } from "./tintes";

export type TintCatalogEntry = { id: string; name: string };

export type CsvTintTypeOption = {
  /** Nombre normalizado (MAYÚSCULAS). */
  name: string;
  rowCount: number;
  existsInCatalog: boolean;
  catalogId: string | null;
};

export type CsvTintFamilyOption = {
  name: string;
  rowCount: number;
  existsInCatalog: boolean;
  catalogId: string | null;
};

/** Nombre de catálogo Tintes: siempre MAYÚSCULAS. */
export function normalizeTintCatalogName(raw: string): string {
  return normalizeTaxonomyNameForDb(raw);
}

export type TintCatalogState = {
  existingTintFamilies: TintCatalogEntry[];
  existingTintTypes: TintCatalogEntry[];
  activeTintTypeCsvKey: string | null;
  activeTintTypeId: string | null;
  activeTintFamilyCsvKey: string | null;
  activeTintFamilyId: string | null;
  tintTypeLinks: Record<string, string>;
  tintFamilyLinks: Record<string, string>;
};

function catalogNameKey(name: string): string {
  return normalizeTintCatalogName(name);
}

function findIdByCatalogName(name: string, catalog: TintCatalogEntry[]): string | null {
  const key = catalogNameKey(name);
  const hit = catalog.find((c) => catalogNameKey(c.name) === key);
  return hit?.id ?? null;
}

function countTintRowsByType(rows: BulkPreviewRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!isTintesCategory(r.mapped.categorySlug)) continue;
    const raw = (r.mapped.tintType ?? "").trim();
    if (!raw) continue;
    const key = catalogNameKey(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function countTintFamiliesForType(rows: BulkPreviewRow[], typeKey: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!isTintesCategory(r.mapped.categorySlug)) continue;
    if (rowTintTypeKey(r) !== typeKey) continue;
    const raw = (r.mapped.tintFamily ?? "").trim();
    if (!raw) continue;
    const key = catalogNameKey(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function rowTintTypeKey(row: BulkPreviewRow): string | null {
  const raw = (row.mapped.tintType ?? "").trim();
  if (!raw) return null;
  return catalogNameKey(raw);
}

function rowTintFamilyKey(row: BulkPreviewRow): string | null {
  const raw = (row.mapped.tintFamily ?? "").trim();
  if (!raw) return null;
  return catalogNameKey(raw);
}

function isTintRowInActiveScope(
  row: BulkPreviewRow,
  activeTypeKey: string | null,
  activeTypeId: string | null,
  activeFamilyKey: string | null,
  activeFamilyId: string | null
): boolean {
  if (!isTintesCategory(row.mapped.categorySlug)) return true;
  if (!activeTypeKey || !activeTypeId || !activeFamilyKey || !activeFamilyId) return false;
  return rowTintTypeKey(row) === activeTypeKey && rowTintFamilyKey(row) === activeFamilyKey;
}

function filterRowLists(
  preview: BulkPreviewResult,
  activeTypeKey: string | null,
  activeTypeId: string | null,
  activeFamilyKey: string | null,
  activeFamilyId: string | null
) {
  const keep = (r: BulkPreviewRow) =>
    isTintRowInActiveScope(r, activeTypeKey, activeTypeId, activeFamilyKey, activeFamilyId);
  return {
    matchedRows: preview.matchedRows.filter(keep),
    unmatchedRows: preview.unmatchedRows.filter(keep),
    ambiguousRows: preview.ambiguousRows.filter(keep),
  };
}

export function buildCsvTintFamilyOptions(
  rows: BulkPreviewRow[],
  typeKey: string,
  existingTintFamilies: TintCatalogEntry[],
  tintFamilyLinks: Record<string, string>
): CsvTintFamilyOption[] {
  const familyCounts = countTintFamiliesForType(rows, typeKey);
  return Array.from(familyCounts.entries())
    .map(([name, rowCount]) => {
      const linkedId = tintFamilyLinks[name] ?? null;
      const catalogId = linkedId ?? findIdByCatalogName(name, existingTintFamilies);
      return {
        name,
        rowCount,
        existsInCatalog: catalogId != null,
        catalogId,
      };
    })
    .sort((a, b) => b.rowCount - a.rowCount || a.name.localeCompare(b.name));
}

/**
 * Enriquece el preview Tintes: un tipo + una familia por importación.
 * El matching de imágenes por nivel solo aplica tras elegir ambos.
 */
export function applyTintCatalogToPreview(
  preview: BulkPreviewResult,
  state: TintCatalogState
): BulkPreviewResult {
  const { existingTintFamilies, existingTintTypes, tintTypeLinks, tintFamilyLinks } = state;
  let {
    activeTintTypeCsvKey,
    activeTintTypeId,
    activeTintFamilyCsvKey,
    activeTintFamilyId,
  } = state;

  const typeCounts = countTintRowsByType(preview.rows);
  const hasTintesRows = typeCounts.size > 0 || preview.rows.some((r) => isTintesCategory(r.mapped.categorySlug));

  const csvTintTypeOptions: CsvTintTypeOption[] = Array.from(typeCounts.entries())
    .map(([name, rowCount]) => {
      const linkedId = tintTypeLinks[name] ?? null;
      const catalogId = linkedId ?? findIdByCatalogName(name, existingTintTypes);
      return {
        name,
        rowCount,
        existsInCatalog: catalogId != null,
        catalogId,
      };
    })
    .sort((a, b) => b.rowCount - a.rowCount || a.name.localeCompare(b.name));

  if (activeTintTypeCsvKey && !activeTintTypeId) {
    activeTintTypeId =
      tintTypeLinks[activeTintTypeCsvKey] ??
      findIdByCatalogName(activeTintTypeCsvKey, existingTintTypes);
  }

  if (activeTintFamilyCsvKey && !activeTintFamilyId) {
    activeTintFamilyId =
      tintFamilyLinks[activeTintFamilyCsvKey] ??
      findIdByCatalogName(activeTintFamilyCsvKey, existingTintFamilies);
  }

  const csvTintFamilyOptions = activeTintTypeCsvKey
    ? buildCsvTintFamilyOptions(preview.rows, activeTintTypeCsvKey, existingTintFamilies, tintFamilyLinks)
    : [];

  const tintSelectionResolved =
    !hasTintesRows ||
    (!!activeTintTypeCsvKey &&
      !!activeTintTypeId &&
      !!activeTintFamilyCsvKey &&
      !!activeTintFamilyId);

  const applyToRow = (r: BulkPreviewRow) => {
    if (!isTintesCategory(r.mapped.categorySlug)) {
      r.tintFamilyId = null;
      r.tintTypeId = null;
      return;
    }

    if (
      activeTintTypeCsvKey &&
      activeTintTypeId &&
      rowTintTypeKey(r) === activeTintTypeCsvKey
    ) {
      r.tintTypeId = activeTintTypeId;
    } else {
      r.tintTypeId = null;
    }

    if (
      activeTintFamilyCsvKey &&
      activeTintFamilyId &&
      rowTintFamilyKey(r) === activeTintFamilyCsvKey
    ) {
      r.tintFamilyId = activeTintFamilyId;
    } else {
      const familyRaw = r.mapped.tintFamily?.trim();
      r.tintFamilyId = familyRaw ? findIdByCatalogName(familyRaw, existingTintFamilies) : null;
    }

    r.issues = r.issues.filter(
      (x) =>
        !x.startsWith("Familia sin resolver") &&
        !x.startsWith("Tipo sin resolver") &&
        x !== "Selecciona un tipo de tinte para importar" &&
        x !== "Selecciona tipo y familia de tinte para importar"
    );

    if (!tintSelectionResolved) {
      r.issues.push("Selecciona tipo y familia de tinte para importar");
    }
  };

  for (const r of preview.rows) applyToRow(r);

  const filtered =
    activeTintTypeCsvKey && activeTintTypeId && activeTintFamilyCsvKey && activeTintFamilyId
      ? filterRowLists(
          preview,
          activeTintTypeCsvKey,
          activeTintTypeId,
          activeTintFamilyCsvKey,
          activeTintFamilyId
        )
      : hasTintesRows
        ? filterRowLists(preview, null, null, null, null)
        : {
            matchedRows: preview.matchedRows,
            unmatchedRows: preview.unmatchedRows,
            ambiguousRows: preview.ambiguousRows,
          };

  for (const r of filtered.matchedRows) applyToRow(r);
  for (const r of filtered.unmatchedRows) applyToRow(r);
  for (const r of filtered.ambiguousRows) applyToRow(r);

  const activeTypeOption = activeTintTypeCsvKey
    ? csvTintTypeOptions.find((o) => o.name === activeTintTypeCsvKey) ?? null
    : null;
  const activeFamilyOption = activeTintFamilyCsvKey
    ? csvTintFamilyOptions.find((o) => o.name === activeTintFamilyCsvKey) ?? null
    : null;

  return {
    ...preview,
    ...filtered,
    existingTintFamilies,
    existingTintTypes,
    csvTintTypeOptions,
    csvTintFamilyOptions,
    hasTintesRows,
    activeTintTypeCsvKey,
    activeTintTypeId,
    activeTintTypeLabel: activeTypeOption?.name ?? activeTintTypeCsvKey,
    activeTintTypeRowCount: activeTypeOption?.rowCount ?? 0,
    activeTintFamilyCsvKey,
    activeTintFamilyId,
    activeTintFamilyLabel: activeFamilyOption?.name ?? activeTintFamilyCsvKey,
    activeTintFamilyRowCount: activeFamilyOption?.rowCount ?? 0,
    tintTypeLinks,
    tintFamilyLinks,
    tintSelectionResolved,
    tintTypeSelectionResolved: tintSelectionResolved,
    newTintFamilies: [],
    newTintTypes: [],
    tintRowSelections: {},
    tintCatalogResolved: tintSelectionResolved,
  };
}

export function readTintCatalogStateFromPreview(preview: BulkPreviewResult | null): TintCatalogState {
  if (!preview) {
    return {
      existingTintFamilies: [],
      existingTintTypes: [],
      activeTintTypeCsvKey: null,
      activeTintTypeId: null,
      activeTintFamilyCsvKey: null,
      activeTintFamilyId: null,
      tintTypeLinks: {},
      tintFamilyLinks: {},
    };
  }
  return {
    existingTintFamilies: preview.existingTintFamilies ?? [],
    existingTintTypes: preview.existingTintTypes ?? [],
    activeTintTypeCsvKey: preview.activeTintTypeCsvKey ?? null,
    activeTintTypeId: preview.activeTintTypeId ?? null,
    activeTintFamilyCsvKey: preview.activeTintFamilyCsvKey ?? null,
    activeTintFamilyId: preview.activeTintFamilyId ?? null,
    tintTypeLinks: preview.tintTypeLinks ?? {},
    tintFamilyLinks: preview.tintFamilyLinks ?? {},
  };
}

export function tintMatchScopeFromState(state: TintCatalogState): { typeKey: string; familyKey: string } | null {
  if (!state.activeTintTypeCsvKey || !state.activeTintFamilyCsvKey) return null;
  return {
    typeKey: state.activeTintTypeCsvKey,
    familyKey: state.activeTintFamilyCsvKey,
  };
}
