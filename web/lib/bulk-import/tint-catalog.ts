import type { BulkPreviewResult, BulkPreviewRow } from "./build-preview";
import { normalizeTaxonomyNameForDb } from "./category-resolve";
import { isTintesCategory, effectiveTintFamily, bulkPreviewRowIsTintes } from "./tintes";

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
  /** CSV sin columna Tipo: el admin asignó un tipo por defecto a filas sin valor. */
  defaultTintTypeApplied?: boolean;
  /** CSV sin columna Familia/Marca útil: familia elegida manualmente para filas sin valor. */
  defaultTintFamilyApplied?: boolean;
  /** Overrides de tipo por fila (previewRowId → tintTypeId). */
  tintTypeOverrides?: Record<string, string>;
};

function catalogNameKey(name: string): string {
  return normalizeTintCatalogName(name);
}

function findIdByCatalogName(name: string, catalog: TintCatalogEntry[]): string | null {
  const key = catalogNameKey(name);
  const hit = catalog.find((c) => catalogNameKey(c.name) === key);
  return hit?.id ?? null;
}

export function countTintRowsInPreview(rows: BulkPreviewRow[]): number {
  return rows.filter((r) => bulkPreviewRowIsTintes(r)).length;
}

function countTintRowsByType(rows: BulkPreviewRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!bulkPreviewRowIsTintes(r)) continue;
    const raw = (r.mapped.tintType ?? "").trim();
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
  const raw = effectiveTintFamily(row.mapped);
  if (!raw) return null;
  return catalogNameKey(raw);
}

function rowEffectiveTintTypeKey(
  row: BulkPreviewRow,
  activeTypeKey: string | null,
  defaultTypeApplied: boolean
): string | null {
  const fromCsv = rowTintTypeKey(row);
  if (fromCsv) return fromCsv;
  if (defaultTypeApplied && activeTypeKey) return activeTypeKey;
  return null;
}

function rowEffectiveTintFamilyKey(
  row: BulkPreviewRow,
  activeFamilyKey: string | null,
  defaultFamilyApplied: boolean
): string | null {
  const fromCsv = rowTintFamilyKey(row);
  if (fromCsv) return fromCsv;
  if (defaultFamilyApplied && activeFamilyKey) return activeFamilyKey;
  return null;
}

function countTintFamiliesForType(
  rows: BulkPreviewRow[],
  typeKey: string,
  defaultTypeApplied: boolean
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!bulkPreviewRowIsTintes(r)) continue;
    if (rowEffectiveTintTypeKey(r, typeKey, defaultTypeApplied) !== typeKey) continue;
    const raw = effectiveTintFamily(r.mapped);
    if (!raw) continue;
    const key = catalogNameKey(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function isTintRowInActiveScope(
  row: BulkPreviewRow,
  activeTypeKey: string | null,
  activeTypeId: string | null,
  activeFamilyKey: string | null,
  activeFamilyId: string | null,
  defaultTypeApplied: boolean,
  defaultFamilyApplied: boolean
): boolean {
  if (!bulkPreviewRowIsTintes(row)) return true;
  if (!activeTypeKey || !activeTypeId || !activeFamilyKey || !activeFamilyId) return false;
  return (
    rowEffectiveTintTypeKey(row, activeTypeKey, defaultTypeApplied) === activeTypeKey &&
    rowEffectiveTintFamilyKey(row, activeFamilyKey, defaultFamilyApplied) === activeFamilyKey
  );
}

function filterRowLists(
  preview: BulkPreviewResult,
  activeTypeKey: string | null,
  activeTypeId: string | null,
  activeFamilyKey: string | null,
  activeFamilyId: string | null,
  defaultTypeApplied: boolean,
  defaultFamilyApplied: boolean
) {
  const keep = (r: BulkPreviewRow) =>
    isTintRowInActiveScope(
      r,
      activeTypeKey,
      activeTypeId,
      activeFamilyKey,
      activeFamilyId,
      defaultTypeApplied,
      defaultFamilyApplied
    );
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
  tintFamilyLinks: Record<string, string>,
  options?: { defaultTintTypeApplied?: boolean }
): CsvTintFamilyOption[] {
  const familyCounts = countTintFamiliesForType(
    rows,
    typeKey,
    options?.defaultTintTypeApplied === true
  );
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

function resolveRowTintTypeId(
  row: BulkPreviewRow,
  state: {
    activeTintTypeCsvKey: string | null;
    activeTintTypeId: string | null;
    defaultTintTypeApplied: boolean;
    tintTypeOverrides: Record<string, string>;
  }
): string | null {
  const override = state.tintTypeOverrides[row.previewRowId];
  if (override) return override;

  if (!state.activeTintTypeCsvKey || !state.activeTintTypeId) return null;

  const effectiveKey = rowEffectiveTintTypeKey(
    row,
    state.activeTintTypeCsvKey,
    state.defaultTintTypeApplied
  );
  if (effectiveKey === state.activeTintTypeCsvKey) return state.activeTintTypeId;
  if (rowTintTypeKey(row) === state.activeTintTypeCsvKey) return state.activeTintTypeId;
  return null;
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
  const defaultTintTypeApplied = state.defaultTintTypeApplied === true;
  const defaultTintFamilyApplied = state.defaultTintFamilyApplied === true;
  const tintTypeOverrides = state.tintTypeOverrides ?? {};

  let {
    activeTintTypeCsvKey,
    activeTintTypeId,
    activeTintFamilyCsvKey,
    activeTintFamilyId,
  } = state;

  const typeCounts = countTintRowsByType(preview.rows);
  const tintRowCount = countTintRowsInPreview(preview.rows);
  const hasTintesRows = typeCounts.size > 0 || tintRowCount > 0;
  const csvMissingTintType = hasTintesRows && typeCounts.size === 0;

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
    ? buildCsvTintFamilyOptions(preview.rows, activeTintTypeCsvKey, existingTintFamilies, tintFamilyLinks, {
        defaultTintTypeApplied,
      })
    : [];

  const tintSelectionResolved =
    !hasTintesRows ||
    (!!activeTintTypeCsvKey &&
      !!activeTintTypeId &&
      !!activeTintFamilyCsvKey &&
      !!activeTintFamilyId);

  const applyToRow = (r: BulkPreviewRow) => {
    if (!bulkPreviewRowIsTintes(r)) {
      r.tintFamilyId = null;
      r.tintTypeId = null;
      return;
    }

    r.tintTypeId = resolveRowTintTypeId(r, {
      activeTintTypeCsvKey,
      activeTintTypeId,
      defaultTintTypeApplied,
      tintTypeOverrides,
    });

    if (
      activeTintFamilyCsvKey &&
      activeTintFamilyId &&
      rowEffectiveTintFamilyKey(r, activeTintFamilyCsvKey, defaultTintFamilyApplied) === activeTintFamilyCsvKey
    ) {
      r.tintFamilyId = activeTintFamilyId;
    } else if (rowTintFamilyKey(r) === activeTintFamilyCsvKey && activeTintFamilyId) {
      r.tintFamilyId = activeTintFamilyId;
    } else {
      const familyRaw = effectiveTintFamily(r.mapped);
      r.tintFamilyId = familyRaw ? findIdByCatalogName(familyRaw, existingTintFamilies) : null;
    }

    r.issues = r.issues.filter(
      (x) =>
        !x.startsWith("Familia sin resolver") &&
        !x.startsWith("Tipo sin resolver") &&
        x !== "Selecciona un tipo de tinte para importar" &&
        x !== "Selecciona tipo y familia de tinte para importar" &&
        x !== "Falta tipo de tinte en el CSV"
    );

    if (!tintSelectionResolved) {
      if (csvMissingTintType && !defaultTintTypeApplied) {
        r.issues.push("Falta tipo de tinte en el CSV");
      } else {
        r.issues.push("Selecciona tipo y familia de tinte para importar");
      }
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
          activeTintFamilyId,
          defaultTintTypeApplied,
          defaultTintFamilyApplied
        )
      : hasTintesRows
        ? filterRowLists(preview, null, null, null, null, defaultTintTypeApplied, defaultTintFamilyApplied)
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

  const activeTintTypeRowCount =
    activeTypeOption?.rowCount ??
    (defaultTintTypeApplied && activeTintTypeCsvKey
      ? preview.rows.filter(
          (r) =>
            bulkPreviewRowIsTintes(r) &&
            rowEffectiveTintTypeKey(r, activeTintTypeCsvKey, true) === activeTintTypeCsvKey
        ).length
      : 0);

  return {
    ...preview,
    ...filtered,
    existingTintFamilies,
    existingTintTypes,
    csvTintTypeOptions,
    csvTintFamilyOptions,
    hasTintesRows,
    csvMissingTintType,
    tintRowsWithoutCsvType: csvMissingTintType ? tintRowCount : 0,
    defaultTintTypeApplied,
    defaultTintFamilyApplied,
    tintTypeOverrides,
    activeTintTypeCsvKey,
    activeTintTypeId,
    activeTintTypeLabel: activeTypeOption?.name ?? activeTintTypeCsvKey,
    activeTintTypeRowCount,
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
      defaultTintTypeApplied: false,
      defaultTintFamilyApplied: false,
      tintTypeOverrides: {},
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
    defaultTintTypeApplied: preview.defaultTintTypeApplied === true,
    defaultTintFamilyApplied: preview.defaultTintFamilyApplied === true,
    tintTypeOverrides: preview.tintTypeOverrides ?? {},
  };
}

export function tintMatchScopeFromState(state: TintCatalogState): { typeKey: string; familyKey: string } | null {
  if (!state.activeTintTypeCsvKey || !state.activeTintFamilyCsvKey) return null;
  return {
    typeKey: state.activeTintTypeCsvKey,
    familyKey: state.activeTintFamilyCsvKey,
  };
}
