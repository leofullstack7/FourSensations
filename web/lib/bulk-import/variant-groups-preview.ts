import { canonicalExternalRef, canonicalVariantGroupCode } from "./variant-group-code";
import type { BulkPreviewRow, BulkPreviewResult } from "./build-preview";

export type BulkPreviewDbVariant = {
  id: string;
  name: string;
  externalRef: string | null;
  variantGroupOrder: number | null;
};

export type BulkPreviewVariantGroup = {
  /** Código de barras normalizado (clave interna). */
  groupKey: string;
  /** Valor mostrado (primera fila del CSV en el grupo). */
  groupLabel: string;
  rowCount: number;
  existingInCsvCount: number;
  newInCsvCount: number;
  /** Variantes en DB con este grupo cuyo código no aparece en el CSV. */
  dbOnlyVariantCount: number;
  primaryRowIndex: number;
};

export function normalizedVariantGroupKey(raw: string | null | undefined): string | null {
  return canonicalVariantGroupCode(raw);
}

export function previewHasVariantGroupColumn(rows: BulkPreviewRow[]): boolean {
  return rows.some((r) => !!r.mapped.variantGroupCode?.trim());
}

export function buildVariantGroupsForPreview(
  rows: BulkPreviewRow[],
  dbByGroup: Map<string, BulkPreviewDbVariant[]>
): BulkPreviewVariantGroup[] {
  const byGroup = new Map<string, BulkPreviewRow[]>();
  for (const row of rows) {
    const key = normalizedVariantGroupKey(row.mapped.variantGroupCode);
    if (!key) continue;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(row);
  }

  const csvCodesByGroup = new Map<string, Set<string>>();
  for (const [key, groupRows] of byGroup) {
    const codes = new Set<string>();
    for (const r of groupRows) {
      if (r.normalizedCode) codes.add(r.normalizedCode);
    }
    csvCodesByGroup.set(key, codes);
  }

  const groups: BulkPreviewVariantGroup[] = [];
  for (const [groupKey, groupRows] of byGroup) {
    groupRows.sort((a, b) => a.rowIndex - b.rowIndex);
    const groupLabel = groupRows[0]?.mapped.variantGroupCode?.trim() || groupKey;
    const csvCodes = csvCodesByGroup.get(groupKey) ?? new Set<string>();
    const dbVariants = dbByGroup.get(groupKey) ?? [];
    const dbOnlyVariantCount = dbVariants.filter((p) => {
      const ref = canonicalExternalRef(p.externalRef);
      return ref && !csvCodes.has(ref);
    }).length;

    groups.push({
      groupKey,
      groupLabel,
      rowCount: groupRows.length,
      existingInCsvCount: groupRows.filter((r) => r.isExistingProduct).length,
      newInCsvCount: groupRows.filter((r) => !r.isExistingProduct).length,
      dbOnlyVariantCount,
      primaryRowIndex: groupRows[0]?.rowIndex ?? 0,
    });
  }

  groups.sort((a, b) => a.primaryRowIndex - b.primaryRowIndex || a.groupLabel.localeCompare(b.groupLabel, "es"));
  return groups;
}

export function dbVariantsByGroupFromProducts(
  products: Array<{
    id: string;
    name: string;
    externalRef: string | null;
    variantGroupCode: string | null;
    variantGroupOrder: number | null;
  }>
): Map<string, BulkPreviewDbVariant[]> {
  const map = new Map<string, BulkPreviewDbVariant[]>();
  for (const p of products) {
    const key = canonicalVariantGroupCode(p.variantGroupCode);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push({
      id: p.id,
      name: p.name,
      externalRef: p.externalRef,
      variantGroupOrder: p.variantGroupOrder,
    });
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        (a.variantGroupOrder ?? 9999) - (b.variantGroupOrder ?? 9999) ||
        a.name.localeCompare(b.name, "es")
    );
  }
  return map;
}

/** Aplica resumen de grupos al preview (tras marcar existentes). */
export function applyVariantGroupsToPreview(
  preview: BulkPreviewResult,
  dbByGroup: Map<string, BulkPreviewDbVariant[]>
): void {
  preview.csvHasVariantGroupColumn = previewHasVariantGroupColumn(preview.rows);
  preview.variantGroups = buildVariantGroupsForPreview(preview.rows, dbByGroup);
  preview.dbVariantsByGroup = Object.fromEntries(dbByGroup);
  preview.stats.variantGroupCount = preview.variantGroups.length;
  preview.stats.existingInVariantGroups = preview.variantGroups.reduce(
    (n, g) => n + g.existingInCsvCount,
    0
  );
}
