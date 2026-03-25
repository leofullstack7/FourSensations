import type { ZipImageEntry } from "./zip-manifest";
import { computeOrphanFiles } from "./zip-manifest";
import { normalizeKey } from "./normalize";
import { buildHeaderFieldMap, mapRowValues, type SemanticMapped } from "./semantic-map";
import { topCodeColumnCandidates, type CodeColumnCandidate } from "./csv";
import type { CategoryRow } from "./category-resolve";
import {
  resolveCategorySlug,
  resolveSubcategoryName,
  resolveCategoryBySubcategory,
  resolveSubcategoryGlobal,
} from "./category-resolve";

export type BulkPreviewImageMatch = {
  imageFilename: string;
  rawImageCode: string;
  numericPrefixCode: string | null;
  matchedCsvCode: string | null;
  matchedBy: "exact" | "numericPrefix" | "sixDigitPrefix" | "none" | "ambiguous";
};

/** Dígitos iniciales del código en CSV (ej. "103718CYE" → "103718"). */
function leadingDigitRunFromCode(codeRaw: string): string {
  const m = codeRaw.trim().match(/^(\d+)/);
  return m?.[1] ?? "";
}

/** Primeros 6 dígitos del run numérico (o menos si el código es más corto). */
function firstSixDigits(digitRun: string): string {
  return digitRun.slice(0, 6);
}

export type BulkPreviewRow = {
  previewRowId: string;
  rowId: string;
  rowIndex: number;
  values: string[];
  normalizedCode: string | null;
  codeRaw: string | null;
  mapped: SemanticMapped & {
    categorySlug: string | null;
    subcategoryName: string | null;
  };
  imageFileNames: string[];
  imageMatches: BulkPreviewImageMatch[];
  isExistingProduct: boolean;
  existingProductId: string | null;
  existingProductName: string | null;
  issues: string[];
  selected: boolean;
};

export type BulkPreviewStats = {
  totalRows: number;
  zipImageFiles: number;
  rowsWithImage: number;
  rowsWithoutImage: number;
  rowsWithErrors: number;
  orphanImageFiles: number;
  matchedRows: number;
  unmatchedRows: number;
  ambiguousRows: number;
  unmatchedImages: number;
};

/** Categoría nueva desde CSV o solo subcategorías nuevas bajo categoría ya existente. */
export type BulkPreviewNewTaxonomyItem =
  | {
      kind: "newCategory";
      categoryName: string;
      subcategories: string[];
      rowCount: number;
    }
  | {
      kind: "newSubcategoriesOnly";
      parentCategorySlug: string;
      parentCategoryName: string;
      subcategories: string[];
      rowCount: number;
    };

export type BulkPreviewResult = {
  headers: string[];
  codeColumnIndex: number;
  codeColumnCandidates: CodeColumnCandidate[];
  /** Compat: todas las filas originales. */
  rows: BulkPreviewRow[];
  matchedRows: BulkPreviewRow[];
  unmatchedRows: BulkPreviewRow[];
  ambiguousRows: BulkPreviewRow[];
  imageMatches: BulkPreviewImageMatch[];
  unmatchedImages: BulkPreviewImageMatch[];
  newCategories: BulkPreviewNewTaxonomyItem[];
  stats: BulkPreviewStats;
  orphanFileNames: string[];
};

function collectBaseRowIssues(
  m: SemanticMapped,
  effectiveCat: string | null,
  subcategoryName: string | null,
  tree: CategoryRow[],
  codeRaw: string,
  categoryFromCsvResolved: boolean,
  subcategoryFromCsvResolved: boolean
): string[] {
  const issues: string[] = [];
  if (!codeRaw.trim()) issues.push("Código vacío");
  if (!m.name?.trim()) issues.push("Falta nombre");
  if (m.price == null) issues.push("Precio inválido o vacío");
  if (m.stock == null) issues.push("Stock inválido");
  if (!effectiveCat) issues.push("Falta categoría");
  if (m.category?.trim() && !categoryFromCsvResolved) issues.push("Categoría CSV no reconocida en el sistema");
  if (effectiveCat && !tree.some((c) => c.slug === effectiveCat)) issues.push("Categoría no reconocida");
  if (effectiveCat && !subcategoryName) issues.push("Falta subcategoría");
  if (m.subcategory?.trim() && effectiveCat && !subcategoryFromCsvResolved) {
    issues.push("Subcategoría CSV no reconocida en la categoría detectada");
  }
  return issues;
}

function isBlockingIssue(issue: string): boolean {
  return issue !== "Sin imagen en ZIP para este código";
}

export function buildBulkPreview(params: {
  headers: string[];
  dataRows: { values: string[] }[];
  codeColumnIndex: number;
  zipEntries: ZipImageEntry[];
  categoryTree: CategoryRow[];
  defaultCategorySlug: string | null;
}): BulkPreviewResult {
  const { headers, dataRows, codeColumnIndex, zipEntries, categoryTree, defaultCategorySlug } = params;
  const headerFieldMap = buildHeaderFieldMap(headers);
  const candidates = topCodeColumnCandidates(headers, dataRows, 8);
  const usedImageFileNames = new Set<string>();

  const rows: BulkPreviewRow[] = dataRows.map((row, rowIndex) => {
    const values = [...row.values];
    while (values.length < headers.length) values.push("");

    const codeRaw = (values[codeColumnIndex] ?? "").trim();
    const normalizedCode = codeRaw ? normalizeKey(codeRaw) : null;
    const mappedRaw = mapRowValues(values, headerFieldMap);

    const stockCols = Array.from(headerFieldMap.entries())
      .filter(([, f]) => f === "stock")
      .map(([i]) => i);
    const hasStockInput = stockCols.some((i) => (values[i] ?? "").trim() !== "");
    const mappedBase: SemanticMapped = {
      ...mappedRaw,
      stock: !hasStockInput && mappedRaw.stock == null ? 0 : mappedRaw.stock,
    };

    const resolvedCategoryFromCsv = resolveCategorySlug(mappedBase.category, categoryTree);
    let categorySlug = resolvedCategoryFromCsv;
    let subcategoryName: string | null = null;
    let subcategoryFromCsvResolved = false;

    // 1) Si tengo categoría detectada, intento resolver sub dentro de esa categoría.
    if (categorySlug) {
      subcategoryName = resolveSubcategoryName(categorySlug, mappedBase.subcategory, categoryTree);
      subcategoryFromCsvResolved = !!subcategoryName;
    }

    // 2) Si no hay categoría o sub no resolvió, intento inferir por subcategoría global.
    if (!subcategoryName) {
      const inferredGlobal = resolveSubcategoryGlobal(mappedBase.subcategory, categoryTree);
      if (inferredGlobal) {
        categorySlug = categorySlug ?? inferredGlobal.categorySlug;
        subcategoryName = inferredGlobal.subcategoryName;
        subcategoryFromCsvResolved = true;
      }
    }

    // 3) Fallback: categoría por defecto solo si no hubo categoría desde CSV/inferencia.
    const effectiveCat = categorySlug ?? defaultCategorySlug;
    const catRow = categoryTree.find((c) => c.slug === effectiveCat);

    const issues = collectBaseRowIssues(
      mappedBase,
      effectiveCat,
      subcategoryName,
      categoryTree,
      codeRaw,
      !!resolvedCategoryFromCsv,
      subcategoryFromCsvResolved
    );

    return {
      previewRowId: `${rowIndex}:${normalizedCode ?? "nocode"}`,
      rowId: `${rowIndex}:${normalizedCode ?? "nocode"}`,
      rowIndex,
      values,
      normalizedCode,
      codeRaw: codeRaw || null,
      mapped: {
        ...mappedBase,
        categorySlug: effectiveCat ?? null,
        subcategoryName,
      },
      imageFileNames: [],
      imageMatches: [],
      isExistingProduct: false,
      existingProductId: null,
      existingProductName: null,
      issues,
      selected: false,
    };
  });

  const rowsByCode = new Map<string, number[]>();
  rows.forEach((r) => {
    if (!r.normalizedCode) return;
    const list = rowsByCode.get(r.normalizedCode) ?? [];
    list.push(r.rowIndex);
    rowsByCode.set(r.normalizedCode, list);
  });

  const ambiguousRowIndexes = new Set<number>();
  const imageMatches: BulkPreviewImageMatch[] = [];

  zipEntries.forEach((img) => {
    let matchedBy: BulkPreviewImageMatch["matchedBy"] = "none";
    let matchedCsvCode: string | null = null;
    let matchedRowIndex: number | null = null;

    const exactRows = rowsByCode.get(img.normalizedRawCode) ?? [];
    if (exactRows.length === 1) {
      matchedBy = "exact";
      matchedRowIndex = exactRows[0]!;
      matchedCsvCode = rows[matchedRowIndex]?.codeRaw ?? img.rawImageCode;
    } else if (exactRows.length > 1) {
      matchedBy = "ambiguous";
      matchedCsvCode = img.rawImageCode;
      exactRows.forEach((i) => ambiguousRowIndexes.add(i));
    } else if (img.normalizedNumericPrefixCode) {
      const numRows = rowsByCode.get(img.normalizedNumericPrefixCode) ?? [];
      if (numRows.length === 1) {
        matchedBy = "numericPrefix";
        matchedRowIndex = numRows[0]!;
        matchedCsvCode = rows[matchedRowIndex]?.codeRaw ?? img.numericPrefixCode;
      } else if (numRows.length > 1) {
        matchedBy = "ambiguous";
        matchedCsvCode = img.numericPrefixCode;
        numRows.forEach((i) => ambiguousRowIndexes.add(i));
      }
    }

    // Coincidencia por los primeros 6 dígitos del prefijo numérico (solo si hay fila única).
    if (matchedBy === "none" && img.numericPrefixCode) {
      const imgHead = firstSixDigits(img.numericPrefixCode);
      if (imgHead.length > 0) {
        const hitRows: number[] = [];
        for (const r of rows) {
          const csvRun = leadingDigitRunFromCode(r.codeRaw ?? "");
          if (!csvRun) continue;
          if (firstSixDigits(csvRun) === imgHead) hitRows.push(r.rowIndex);
        }
        if (hitRows.length === 1) {
          matchedBy = "sixDigitPrefix";
          matchedRowIndex = hitRows[0]!;
          matchedCsvCode = rows[matchedRowIndex]?.codeRaw ?? imgHead;
        } else if (hitRows.length > 1) {
          matchedBy = "ambiguous";
          matchedCsvCode = imgHead;
          hitRows.forEach((i) => ambiguousRowIndexes.add(i));
        }
      }
    }

    const detail: BulkPreviewImageMatch = {
      imageFilename: img.fileName,
      rawImageCode: img.rawImageCode,
      numericPrefixCode: img.numericPrefixCode,
      matchedCsvCode,
      matchedBy,
    };
    imageMatches.push(detail);

    if (
      matchedRowIndex != null &&
      (matchedBy === "exact" || matchedBy === "numericPrefix" || matchedBy === "sixDigitPrefix")
    ) {
      const target = rows[matchedRowIndex];
      if (target) {
        target.imageFileNames.push(img.fileName);
        target.imageMatches.push(detail);
        usedImageFileNames.add(img.fileName);
      }
    }
  });

  const codeCount = new Map<string, number>();
  rows.forEach((r) => {
    if (!r.normalizedCode) return;
    codeCount.set(r.normalizedCode, (codeCount.get(r.normalizedCode) ?? 0) + 1);
  });

  rows.forEach((r) => {
    r.imageFileNames.sort((a, b) => a.localeCompare(b));

    if (!r.imageFileNames.length && r.codeRaw) {
      r.issues.push("Sin imagen en ZIP para este código");
    }
    if ((r.normalizedCode && (codeCount.get(r.normalizedCode) ?? 0) > 1)) {
      r.issues.push("Código duplicado en el CSV");
      ambiguousRowIndexes.add(r.rowIndex);
    }
    if (ambiguousRowIndexes.has(r.rowIndex)) {
      r.issues.push("Match ambiguo con imágenes");
    }

    const blocking = r.issues.filter(isBlockingIssue);
    const hasValidMatch = r.imageMatches.some(
      (m) => m.matchedBy === "exact" || m.matchedBy === "numericPrefix" || m.matchedBy === "sixDigitPrefix"
    );
    r.selected =
      hasValidMatch &&
      blocking.length === 0 &&
      !!r.codeRaw &&
      !!r.mapped.name &&
      r.mapped.price != null &&
      !!r.mapped.categorySlug;
  });

  const matchedRows = rows.filter((r) =>
    r.imageMatches.some(
      (m) => m.matchedBy === "exact" || m.matchedBy === "numericPrefix" || m.matchedBy === "sixDigitPrefix"
    )
  );
  const ambiguousRows = rows.filter((r) =>
    !r.imageMatches.some(
      (m) => m.matchedBy === "exact" || m.matchedBy === "numericPrefix" || m.matchedBy === "sixDigitPrefix"
    ) &&
    r.issues.includes("Match ambiguo con imágenes")
  );
  const unmatchedRows = rows.filter((r) =>
    !r.imageMatches.some(
      (m) => m.matchedBy === "exact" || m.matchedBy === "numericPrefix" || m.matchedBy === "sixDigitPrefix"
    ) &&
    !r.issues.includes("Match ambiguo con imágenes")
  );

  const unmatchedImages = imageMatches.filter((m) => m.matchedBy === "none");
  const orphanFileNames = computeOrphanFiles(zipEntries, usedImageFileNames);
  const newCategoryMap = new Map<string, { categoryName: string; subs: Set<string>; rowCount: number }>();
  rows.forEach((r) => {
    const rawCategory = (r.mapped.category ?? "").trim();
    if (!rawCategory) return;
    const resolved = resolveCategorySlug(rawCategory, categoryTree);
    if (resolved) return;
    const key = normalizeKey(rawCategory);
    const current = newCategoryMap.get(key) ?? {
      categoryName: rawCategory,
      subs: new Set<string>(),
      rowCount: 0,
    };
    current.rowCount += 1;
    const rawSub = (r.mapped.subcategory ?? "").trim();
    if (rawSub) current.subs.add(rawSub);
    newCategoryMap.set(key, current);
  });

  /** Subcategoría en CSV no reconocida dentro de la categoría efectiva (categoría sí existe en sistema). */
  const newSubsByParentSlug = new Map<
    string,
    { parentCategorySlug: string; parentCategoryName: string; subs: Set<string>; rowCount: number }
  >();
  rows.forEach((r) => {
    if (!r.issues.includes("Subcategoría CSV no reconocida en la categoría detectada")) return;
    const slug = r.mapped.categorySlug;
    if (!slug) return;
    const rawSub = (r.mapped.subcategory ?? "").trim();
    if (!rawSub) return;
    const catRow = categoryTree.find((c) => c.slug === slug);
    const parentCategoryName = catRow?.name ?? slug;
    const current = newSubsByParentSlug.get(slug) ?? {
      parentCategorySlug: slug,
      parentCategoryName,
      subs: new Set<string>(),
      rowCount: 0,
    };
    current.rowCount += 1;
    current.subs.add(rawSub);
    newSubsByParentSlug.set(slug, current);
  });

  const fromNewCategories: BulkPreviewNewTaxonomyItem[] = Array.from(newCategoryMap.values()).map((x) => ({
    kind: "newCategory" as const,
    categoryName: x.categoryName,
    subcategories: Array.from(x.subs).sort((a, b) => a.localeCompare(b)),
    rowCount: x.rowCount,
  }));

  const fromNewSubsOnly: BulkPreviewNewTaxonomyItem[] = Array.from(newSubsByParentSlug.values()).map((x) => ({
    kind: "newSubcategoriesOnly" as const,
    parentCategorySlug: x.parentCategorySlug,
    parentCategoryName: x.parentCategoryName,
    subcategories: Array.from(x.subs).sort((a, b) => a.localeCompare(b)),
    rowCount: x.rowCount,
  }));

  const taxonomySortLabel = (x: BulkPreviewNewTaxonomyItem) =>
    x.kind === "newCategory" ? x.categoryName : x.parentCategoryName;
  const newCategories = [...fromNewCategories, ...fromNewSubsOnly].sort(
    (a, b) => b.rowCount - a.rowCount || taxonomySortLabel(a).localeCompare(taxonomySortLabel(b))
  );

  const rowsWithErrors = rows.filter((r) => r.issues.filter(isBlockingIssue).length > 0).length;

  return {
    headers,
    codeColumnIndex,
    codeColumnCandidates: candidates,
    rows,
    matchedRows,
    unmatchedRows,
    ambiguousRows,
    imageMatches: imageMatches.sort((a, b) => a.imageFilename.localeCompare(b.imageFilename)),
    unmatchedImages,
    newCategories,
    orphanFileNames,
    stats: {
      totalRows: rows.length,
      zipImageFiles: zipEntries.length,
      rowsWithImage: matchedRows.length,
      rowsWithoutImage: unmatchedRows.length,
      rowsWithErrors,
      orphanImageFiles: orphanFileNames.length,
      matchedRows: matchedRows.length,
      unmatchedRows: unmatchedRows.length,
      ambiguousRows: ambiguousRows.length,
      unmatchedImages: unmatchedImages.length,
    },
  };
}
