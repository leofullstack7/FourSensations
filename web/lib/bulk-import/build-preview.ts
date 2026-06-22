import type { ZipImageEntry } from "./zip-manifest";
import { computeOrphanFiles } from "./zip-manifest";
import { normalizeKey } from "./normalize";
import {
  buildHeaderFieldMap,
  effectiveProductTitle,
  enrichSparseMappedFromTags,
  mapRowValues,
  mergeTagTokenLists,
  parseTagsFromCell,
  type SemanticMapped,
} from "./semantic-map";
import { topCodeColumnCandidates, type CodeColumnCandidate } from "./csv";
import type { CategoryRow } from "./category-resolve";
import {
  resolveCategorySlug,
  resolveSubcategoryName,
  resolveSubcategoryGlobal,
  resolveTaxonomyFromCsvFixedMap,
  taxonomyPairKey,
  computeTaxonomyRehomeSuggestion,
  normalizeTaxonomyNameForDb,
  type TaxonomyRehomeKind,
} from "./category-resolve";
import { isTintesCategory, normalizeTintLevelKey } from "./tintes";
import type { TintCatalogEntry, CsvTintTypeOption } from "./tint-catalog";

export type BulkPreviewImageMatch = {
  imageFilename: string;
  rawImageCode: string;
  numericPrefixCode: string | null;
  matchedCsvCode: string | null;
  matchedBy: "exact" | "numericPrefix" | "sixDigitPrefix" | "tintLevel" | "none" | "ambiguous";
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
  /** Resolución antes de aplicar override manual (CSV + inferencia). */
  taxonomyBeforeOverride: { categorySlug: string | null; subcategoryName: string | null };
  /** Catálogo Tintes: id resuelto de Familia (null si no aplica o sin resolver). */
  tintFamilyId: string | null;
  /** Catálogo Tintes: id resuelto de Tipo (null si no aplica o sin resolver). */
  tintTypeId: string | null;
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
  /** Coincidencias con `Product.externalRef` (se rellena tras `markBulkPreviewExistingByExternalRef`). */
  existingProductRows: number;
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

/** Sugerencia: el CSV parece confundir categoría/sub con otra rama ya registrada. */
export type BulkTaxonomyRehomeHint = {
  id: string;
  pairKey: string;
  csvCategoryDisplay: string;
  csvSubcategoryDisplay: string;
  rowCount: number;
  kind: TaxonomyRehomeKind;
  suggestedCategorySlug: string;
  suggestedCategoryName: string;
  suggestedSubcategoryName: string;
};

export type BulkPreviewResult = {
  headers: string[];
  codeColumnIndex: number;
  codeColumnCandidates: CodeColumnCandidate[];
  /** Hay al menos una columna CSV mapeada a etiquetas de producto. */
  csvHasTagsColumn: boolean;
  /** Compat: todas las filas originales. */
  rows: BulkPreviewRow[];
  matchedRows: BulkPreviewRow[];
  unmatchedRows: BulkPreviewRow[];
  ambiguousRows: BulkPreviewRow[];
  imageMatches: BulkPreviewImageMatch[];
  unmatchedImages: BulkPreviewImageMatch[];
  newCategories: BulkPreviewNewTaxonomyItem[];
  /** Overrides desde la UI: reubicar (categoría CSV, sub CSV) → slug + sub del sistema. */
  taxonomyOverrides: Record<string, { categorySlug: string; subcategoryName: string }>;
  /** Pares CSV para los que el usuario rechazó la sugerencia (no volver a mostrar). */
  taxonomyRehomeDismissed: Record<string, boolean>;
  taxonomyRehomeHints: BulkTaxonomyRehomeHint[];
  stats: BulkPreviewStats;
  orphanFileNames: string[];
  /** Catálogo Tintes — familias/tipos ya en DB. */
  existingTintFamilies: TintCatalogEntry[];
  existingTintTypes: TintCatalogEntry[];
  /** Tipos distintos encontrados en filas Tintes del CSV. */
  csvTintTypeOptions: CsvTintTypeOption[];
  hasTintesRows: boolean;
  /** Tipo del CSV elegido para importar en esta sesión (MAYÚSCULAS). */
  activeTintTypeCsvKey: string | null;
  activeTintTypeId: string | null;
  activeTintTypeLabel: string | null;
  activeTintTypeRowCount: number;
  /** Vincular nombre CSV de tipo → id existente. */
  tintTypeLinks: Record<string, string>;
  /** true cuando hay Tintes y ya se eligió + resolvió el tipo activo. */
  tintTypeSelectionResolved: boolean;
  /** @deprecated Compat — usar tintTypeSelectionResolved */
  newTintFamilies: string[];
  /** @deprecated Compat */
  newTintTypes: string[];
  /** @deprecated Compat */
  tintFamilyLinks: Record<string, string>;
  /** @deprecated Compat */
  tintRowSelections: Record<string, { tintFamilyId: string; tintTypeId: string }>;
  /** @deprecated Compat — usar tintTypeSelectionResolved */
  tintCatalogResolved: boolean;
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
  if (!effectiveProductTitle(m)) issues.push("Falta nombre");
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

function isValidImageMatch(m: BulkPreviewImageMatch): boolean {
  return (
    m.matchedBy === "exact" ||
    m.matchedBy === "numericPrefix" ||
    m.matchedBy === "sixDigitPrefix" ||
    m.matchedBy === "tintLevel"
  );
}

function isBlockingIssue(issue: string): boolean {
  return issue !== "Sin imagen en ZIP para este código" && issue !== "Sin imagen en ZIP para este nivel";
}

/** Columnas sin mapeo semántico que parecen listas (misma fila pegada en un solo campo). */
function harvestListLikeUnmappedTokens(
  values: string[],
  headerFieldMap: Map<number, keyof SemanticMapped>,
  codeColumnIndex: number
): string[] {
  const chunks: string[][] = [];
  for (let i = 0; i < values.length; i++) {
    if (i === codeColumnIndex) continue;
    if (headerFieldMap.has(i)) continue;
    const raw = (values[i] ?? "").trim();
    if (raw.length < 10) continue;
    if (!/[,;|]/.test(raw)) continue;
    const parts = parseTagsFromCell(raw);
    if (parts.length >= 3) chunks.push(parts);
  }
  return mergeTagTokenLists(chunks);
}

export function buildBulkPreview(params: {
  headers: string[];
  dataRows: { values: string[] }[];
  codeColumnIndex: number;
  zipEntries: ZipImageEntry[];
  categoryTree: CategoryRow[];
  defaultCategorySlug: string | null;
  taxonomyOverrides?: Record<string, { categorySlug: string; subcategoryName: string }>;
  taxonomyRehomeDismissed?: Record<string, boolean>;
}): BulkPreviewResult {
  const {
    headers,
    dataRows,
    codeColumnIndex,
    zipEntries,
    categoryTree,
    defaultCategorySlug,
    taxonomyOverrides = {},
    taxonomyRehomeDismissed = {},
  } = params;
  const headerFieldMap = buildHeaderFieldMap(headers);
  const csvHasTagsColumn = Array.from(headerFieldMap.values()).some((f) => f === "tags");
  const candidates = topCodeColumnCandidates(headers, dataRows, 8);
  const usedImageFileNames = new Set<string>();

  const rows: BulkPreviewRow[] = dataRows.map((row, rowIndex) => {
    const values = [...row.values];
    while (values.length < headers.length) values.push("");

    const codeRaw = (values[codeColumnIndex] ?? "").trim();
    const normalizedCode = codeRaw ? normalizeKey(codeRaw) : null;
    const mappedRaw = mapRowValues(values, headerFieldMap);
    const unmappedTokens = harvestListLikeUnmappedTokens(values, headerFieldMap, codeColumnIndex);
    const mappedForEnrich: SemanticMapped = {
      ...mappedRaw,
      tags: mergeTagTokenLists([mappedRaw.tags, unmappedTokens]),
    };

    const stockCols = Array.from(headerFieldMap.entries())
      .filter(([, f]) => f === "stock")
      .map(([i]) => i);
    const hasStockInput = stockCols.some((i) => (values[i] ?? "").trim() !== "");
    const enriched = enrichSparseMappedFromTags(mappedForEnrich, codeRaw);
    const mappedBase: SemanticMapped = {
      ...enriched,
      stock: !hasStockInput && enriched.stock == null ? 0 : enriched.stock,
    };

    const pairKey = taxonomyPairKey(mappedBase.category, mappedBase.subcategory);
    const fixedTaxonomy = resolveTaxonomyFromCsvFixedMap(mappedBase.category, mappedBase.subcategory);
    let resolvedCategoryFromCsv: string | null = null;
    let categorySlug: string | null = null;
    let subcategoryName: string | null = null;
    let subcategoryFromCsvResolved = false;

    if (fixedTaxonomy) {
      categorySlug = fixedTaxonomy.categorySlug;
      subcategoryName = fixedTaxonomy.subcategoryName;
      subcategoryFromCsvResolved = true;
      resolvedCategoryFromCsv = fixedTaxonomy.categorySlug;
    } else {
      resolvedCategoryFromCsv = resolveCategorySlug(mappedBase.category, categoryTree);
      categorySlug = resolvedCategoryFromCsv;

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
    }

    // 3) Fallback: categoría por defecto solo si no hubo categoría desde CSV/inferencia.
    let effectiveCat = categorySlug ?? defaultCategorySlug;
    let categoryFromCsvResolvedFlag = !!resolvedCategoryFromCsv;
    let subFromCsvResolvedFlag = subcategoryFromCsvResolved;

    const taxonomyBeforeOverride: { categorySlug: string | null; subcategoryName: string | null } = {
      categorySlug: effectiveCat ?? null,
      subcategoryName,
    };

    const ov = taxonomyOverrides[pairKey];
    if (ov) {
      effectiveCat = ov.categorySlug;
      subcategoryName = ov.subcategoryName;
      categoryFromCsvResolvedFlag = true;
      subFromCsvResolvedFlag = true;
    }

    const issues = collectBaseRowIssues(
      mappedBase,
      effectiveCat,
      subcategoryName,
      categoryTree,
      codeRaw,
      categoryFromCsvResolvedFlag,
      subFromCsvResolvedFlag
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
      taxonomyBeforeOverride,
      tintFamilyId: null,
      tintTypeId: null,
    };
  });

  const rowsByCode = new Map<string, number[]>();
  rows.forEach((r) => {
    if (!r.normalizedCode) return;
    const list = rowsByCode.get(r.normalizedCode) ?? [];
    list.push(r.rowIndex);
    rowsByCode.set(r.normalizedCode, list);
  });

  /** Tintes: índice por columna Nivel (no por código de referencia). */
  const rowsByTintLevel = new Map<string, number[]>();
  rows.forEach((r) => {
    if (!isTintesCategory(r.mapped.categorySlug)) return;
    const nivelKey = normalizeTintLevelKey(r.mapped.tintLevel);
    if (!nivelKey) return;
    const list = rowsByTintLevel.get(nivelKey) ?? [];
    list.push(r.rowIndex);
    rowsByTintLevel.set(nivelKey, list);
  });

  const ambiguousRowIndexes = new Set<number>();
  const imageMatches: BulkPreviewImageMatch[] = [];

  zipEntries.forEach((img) => {
    let matchedBy: BulkPreviewImageMatch["matchedBy"] = "none";
    let matchedCsvCode: string | null = null;
    let matchedRowIndex: number | null = null;

    // Tintes: nombre de archivo ≈ columna Nivel del CSV (prioridad sobre código).
    const nivelKeyFromImage = normalizeTintLevelKey(img.baseName);
    if (nivelKeyFromImage) {
      const tintRows = rowsByTintLevel.get(nivelKeyFromImage) ?? [];
      if (tintRows.length === 1) {
        matchedBy = "tintLevel";
        matchedRowIndex = tintRows[0]!;
        matchedCsvCode = rows[matchedRowIndex]?.mapped.tintLevel ?? img.baseName;
      } else if (tintRows.length > 1) {
        matchedBy = "ambiguous";
        matchedCsvCode = img.baseName;
        tintRows.forEach((i) => ambiguousRowIndexes.add(i));
      }
    }

    if (matchedBy === "none") {
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
      isValidImageMatch({ ...detail, matchedBy })
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

  const tintLevelCount = new Map<string, number>();
  rows.forEach((r) => {
    if (!isTintesCategory(r.mapped.categorySlug)) return;
    const tk = normalizeTintLevelKey(r.mapped.tintLevel);
    if (!tk) return;
    tintLevelCount.set(tk, (tintLevelCount.get(tk) ?? 0) + 1);
  });

  rows.forEach((r) => {
    r.imageFileNames.sort((a, b) => a.localeCompare(b));

    if (!r.imageFileNames.length) {
      if (isTintesCategory(r.mapped.categorySlug) && r.mapped.tintLevel?.trim()) {
        r.issues.push("Sin imagen en ZIP para este nivel");
      } else if (r.codeRaw) {
        r.issues.push("Sin imagen en ZIP para este código");
      }
    }
    if (r.normalizedCode && (codeCount.get(r.normalizedCode) ?? 0) > 1) {
      r.issues.push("Código duplicado en el CSV");
      ambiguousRowIndexes.add(r.rowIndex);
    }
    if (isTintesCategory(r.mapped.categorySlug)) {
      const tk = normalizeTintLevelKey(r.mapped.tintLevel);
      if (tk && (tintLevelCount.get(tk) ?? 0) > 1) {
        r.issues.push("Nivel duplicado en el CSV");
        ambiguousRowIndexes.add(r.rowIndex);
      }
    }
    if (ambiguousRowIndexes.has(r.rowIndex)) {
      r.issues.push("Match ambiguo con imágenes");
    }

    const blocking = r.issues.filter(isBlockingIssue);
    /** No bloquea la selección por defecto: la política «skip/replace» se aplica al importar. */
    const blockingForAutoSelect = blocking.filter((x) => x !== "Producto ya registrado");
    const hasValidMatch = r.imageMatches.some(isValidImageMatch);
    r.selected =
      hasValidMatch &&
      blockingForAutoSelect.length === 0 &&
      !!r.codeRaw &&
      !!effectiveProductTitle(r.mapped) &&
      r.mapped.price != null &&
      !!r.mapped.categorySlug;
  });

  const matchedRows = rows.filter((r) => r.imageMatches.some(isValidImageMatch));
  const ambiguousRows = rows.filter(
    (r) => !r.imageMatches.some(isValidImageMatch) && r.issues.includes("Match ambiguo con imágenes")
  );
  const unmatchedRows = rows.filter(
    (r) => !r.imageMatches.some(isValidImageMatch) && !r.issues.includes("Match ambiguo con imágenes")
  );

  const unmatchedImages = imageMatches.filter((m) => m.matchedBy === "none");
  const orphanFileNames = computeOrphanFiles(zipEntries, usedImageFileNames);
  const newCategoryMap = new Map<string, { categoryName: string; subs: Set<string>; rowCount: number }>();
  rows.forEach((r) => {
    const rawCategory = (r.mapped.category ?? "").trim();
    if (!rawCategory) return;
    if (resolveTaxonomyFromCsvFixedMap(r.mapped.category, r.mapped.subcategory)) return;
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
    if (rawSub) current.subs.add(normalizeTaxonomyNameForDb(rawSub));
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
    current.subs.add(normalizeTaxonomyNameForDb(rawSub));
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

  const hintAgg = new Map<
    string,
    {
      pairKey: string;
      csvCategoryDisplay: string;
      csvSubcategoryDisplay: string;
      kind: TaxonomyRehomeKind;
      suggestedCategorySlug: string;
      suggestedCategoryName: string;
      suggestedSubcategoryName: string;
      rowCount: number;
    }
  >();

  for (const r of rows) {
    const pk = taxonomyPairKey(r.mapped.category, r.mapped.subcategory);
    if (taxonomyRehomeDismissed[pk]) continue;
    if (taxonomyOverrides[pk]) continue;
    const sug = computeTaxonomyRehomeSuggestion({
      csvCategory: r.mapped.category,
      csvSubcategory: r.mapped.subcategory,
      tree: categoryTree,
      resolvedCategorySlug: r.taxonomyBeforeOverride.categorySlug,
      resolvedSubcategoryName: r.taxonomyBeforeOverride.subcategoryName,
    });
    if (!sug) continue;
    const hid = `${pk}:::${sug.suggestedCategorySlug}:::${sug.suggestedSubcategoryName}:::${sug.kind}`;
    const cur = hintAgg.get(hid);
    if (cur) {
      cur.rowCount += 1;
    } else {
      hintAgg.set(hid, {
        pairKey: pk,
        csvCategoryDisplay: (r.mapped.category ?? "").trim() || "—",
        csvSubcategoryDisplay: (r.mapped.subcategory ?? "").trim() || "—",
        kind: sug.kind,
        suggestedCategorySlug: sug.suggestedCategorySlug,
        suggestedCategoryName: sug.suggestedCategoryName,
        suggestedSubcategoryName: sug.suggestedSubcategoryName,
        rowCount: 1,
      });
    }
  }

  const taxonomyRehomeHints: BulkTaxonomyRehomeHint[] = Array.from(hintAgg.entries())
    .map(([id, h]) => ({ id, ...h }))
    .sort((a, b) => b.rowCount - a.rowCount || a.csvCategoryDisplay.localeCompare(b.csvCategoryDisplay));

  const rowsWithErrors = rows.filter((r) => r.issues.filter(isBlockingIssue).length > 0).length;

  return {
    headers,
    codeColumnIndex,
    codeColumnCandidates: candidates,
    csvHasTagsColumn,
    rows,
    matchedRows,
    unmatchedRows,
    ambiguousRows,
    imageMatches: imageMatches.sort((a, b) => a.imageFilename.localeCompare(b.imageFilename)),
    unmatchedImages,
    newCategories,
    taxonomyOverrides: { ...taxonomyOverrides },
    taxonomyRehomeDismissed: { ...taxonomyRehomeDismissed },
    taxonomyRehomeHints,
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
      existingProductRows: 0,
    },
    existingTintFamilies: [],
    existingTintTypes: [],
    csvTintTypeOptions: [],
    hasTintesRows: false,
    activeTintTypeCsvKey: null,
    activeTintTypeId: null,
    activeTintTypeLabel: null,
    activeTintTypeRowCount: 0,
    tintTypeLinks: {},
    tintTypeSelectionResolved: true,
    newTintFamilies: [],
    newTintTypes: [],
    tintFamilyLinks: {},
    tintRowSelections: {},
    tintCatalogResolved: true,
  };
}
