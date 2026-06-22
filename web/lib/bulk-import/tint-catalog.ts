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

/** Nombre de catálogo Tintes: siempre MAYÚSCULAS. */
export function normalizeTintCatalogName(raw: string): string {
  return normalizeTaxonomyNameForDb(raw);
}

export type TintCatalogState = {
  existingTintFamilies: TintCatalogEntry[];
  existingTintTypes: TintCatalogEntry[];
  /** Tipo del CSV elegido para esta sesión de importación (un solo tipo por carga). */
  activeTintTypeCsvKey: string | null;
  activeTintTypeId: string | null;
  /** Vincular nombre CSV de tipo → id existente (sin crear). */
  tintTypeLinks: Record<string, string>;
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

function rowTintTypeKey(row: BulkPreviewRow): string | null {
  const raw = (row.mapped.tintType ?? "").trim();
  if (!raw) return null;
  return catalogNameKey(raw);
}

function isTintRowVisible(row: BulkPreviewRow, activeKey: string | null, activeTypeId: string | null): boolean {
  if (!isTintesCategory(row.mapped.categorySlug)) return true;
  if (!activeKey || !activeTypeId) return false;
  return rowTintTypeKey(row) === activeKey;
}

function filterRowLists(preview: BulkPreviewResult, activeKey: string | null, activeTypeId: string | null) {
  const keep = (r: BulkPreviewRow) => isTintRowVisible(r, activeKey, activeTypeId);
  return {
    matchedRows: preview.matchedRows.filter(keep),
    unmatchedRows: preview.unmatchedRows.filter(keep),
    ambiguousRows: preview.ambiguousRows.filter(keep),
  };
}

/**
 * Enriquece el preview Tintes: un solo tipo por importación, filas filtradas al tipo activo.
 * Familia se auto-empareja con catálogo; si no existe, se crea en el commit (sin modal).
 */
export function applyTintCatalogToPreview(
  preview: BulkPreviewResult,
  state: TintCatalogState
): BulkPreviewResult {
  const { existingTintFamilies, existingTintTypes, tintTypeLinks } = state;
  let { activeTintTypeCsvKey, activeTintTypeId } = state;

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

  const tintTypeSelectionResolved = !hasTintesRows || (!!activeTintTypeCsvKey && !!activeTintTypeId);

  const applyToRow = (r: BulkPreviewRow) => {
    if (!isTintesCategory(r.mapped.categorySlug)) {
      r.tintFamilyId = null;
      r.tintTypeId = null;
      return;
    }

    const familyRaw = r.mapped.tintFamily?.trim();
    r.tintFamilyId = familyRaw ? findIdByCatalogName(familyRaw, existingTintFamilies) : null;

    if (activeTintTypeCsvKey && activeTintTypeId && rowTintTypeKey(r) === activeTintTypeCsvKey) {
      r.tintTypeId = activeTintTypeId;
    } else {
      r.tintTypeId = null;
    }

    r.issues = r.issues.filter(
      (x) =>
        !x.startsWith("Familia sin resolver") &&
        !x.startsWith("Tipo sin resolver") &&
        x !== "Selecciona un tipo de tinte para importar"
    );

    if (!tintTypeSelectionResolved) {
      r.issues.push("Selecciona un tipo de tinte para importar");
    }
  };

  for (const r of preview.rows) applyToRow(r);

  const filtered =
    activeTintTypeCsvKey && activeTintTypeId
      ? filterRowLists(preview, activeTintTypeCsvKey, activeTintTypeId)
      : hasTintesRows
        ? filterRowLists(preview, null, null)
        : {
            matchedRows: preview.matchedRows,
            unmatchedRows: preview.unmatchedRows,
            ambiguousRows: preview.ambiguousRows,
          };

  for (const r of filtered.matchedRows) applyToRow(r);
  for (const r of filtered.unmatchedRows) applyToRow(r);
  for (const r of filtered.ambiguousRows) applyToRow(r);

  const activeOption = activeTintTypeCsvKey
    ? csvTintTypeOptions.find((o) => o.name === activeTintTypeCsvKey) ?? null
    : null;

  return {
    ...preview,
    ...filtered,
    existingTintFamilies,
    existingTintTypes,
    csvTintTypeOptions,
    hasTintesRows,
    activeTintTypeCsvKey,
    activeTintTypeId,
    activeTintTypeLabel: activeOption?.name ?? activeTintTypeCsvKey,
    activeTintTypeRowCount: activeOption?.rowCount ?? 0,
    tintTypeLinks,
    tintTypeSelectionResolved,
    newTintFamilies: [],
    newTintTypes: [],
    tintFamilyLinks: {},
    tintRowSelections: {},
    tintCatalogResolved: tintTypeSelectionResolved,
  };
}

export function readTintCatalogStateFromPreview(preview: BulkPreviewResult | null): TintCatalogState {
  if (!preview) {
    return {
      existingTintFamilies: [],
      existingTintTypes: [],
      activeTintTypeCsvKey: null,
      activeTintTypeId: null,
      tintTypeLinks: {},
    };
  }
  return {
    existingTintFamilies: preview.existingTintFamilies ?? [],
    existingTintTypes: preview.existingTintTypes ?? [],
    activeTintTypeCsvKey: preview.activeTintTypeCsvKey ?? null,
    activeTintTypeId: preview.activeTintTypeId ?? null,
    tintTypeLinks: preview.tintTypeLinks ?? {},
  };
}

/** ¿El tipo activo del CSV aún no está en catálogo? */
export function activeTintTypeNeedsCatalogAction(preview: BulkPreviewResult | null): boolean {
  if (!preview?.activeTintTypeCsvKey) return false;
  if (preview.activeTintTypeId) return false;
  const opt = preview.csvTintTypeOptions?.find((o) => o.name === preview.activeTintTypeCsvKey);
  return opt ? !opt.existsInCatalog : true;
}
