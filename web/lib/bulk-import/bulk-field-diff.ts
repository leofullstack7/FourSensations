import type { BulkPreviewRow } from "./build-preview";
import { effectiveProductTitle, normalizeProductNameForDb } from "./semantic-map";
import { normalizeTaxonomyNameForDb } from "./category-resolve";

/** Snapshot de producto en tienda para comparar con el CSV (modo actualizar). */
export type BulkExistingSnapshot = {
  name: string;
  brand: string;
  description: string;
  price: number;
  originalPrice: number | null;
  stock: number;
  category: string;
  subcategory: string;
  tags: string[];
  imageUrl: string | null;
  variantGroupCode: string | null;
  colorHex: string | null;
  colorName: string | null;
};

export type BulkFieldDiff = {
  field:
    | "name"
    | "brand"
    | "description"
    | "price"
    | "stock"
    | "category"
    | "subcategory"
    | "tags"
    | "variantGroupCode"
    | "colorHex";
  label: string;
  before: string;
  after: string;
};

function normText(v: string | null | undefined): string {
  return (v ?? "").trim();
}

function tagsKey(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.toLowerCase())
    .sort()
    .join("|");
}

function formatTags(tags: string[]): string {
  const t = tags.map((x) => x.trim()).filter(Boolean);
  return t.length ? t.join(", ") : "—";
}

function formatPriceCop(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Compara CSV mapeado vs snapshot en tienda.
 * Solo incluye campos que realmente cambian.
 */
export function computeBulkRowFieldDiffs(
  row: BulkPreviewRow,
  categoryLabel?: (slug: string) => string
): BulkFieldDiff[] {
  const snap = row.existingSnapshot;
  if (!snap || !row.isExistingProduct) return [];

  const diffs: BulkFieldDiff[] = [];
  const csvName = normalizeProductNameForDb(effectiveProductTitle(row.mapped) ?? "");
  const dbName = normalizeProductNameForDb(snap.name);
  if (csvName && csvName !== dbName) {
    diffs.push({ field: "name", label: "Nombre", before: snap.name, after: csvName });
  }

  const csvBrand = normText(row.mapped.brand) || "GinnaBeauty";
  if (csvBrand !== normText(snap.brand)) {
    diffs.push({ field: "brand", label: "Marca", before: snap.brand || "—", after: csvBrand });
  }

  const csvDesc =
    normText(row.mapped.description) || (csvName ? `Producto: ${csvName}` : "");
  if (csvDesc && csvDesc !== normText(snap.description)) {
    diffs.push({
      field: "description",
      label: "Descripción",
      before: snap.description || "—",
      after: csvDesc,
    });
  }

  if (row.mapped.price != null && row.mapped.price !== snap.price) {
    diffs.push({
      field: "price",
      label: "Precio",
      before: formatPriceCop(snap.price),
      after: formatPriceCop(row.mapped.price),
    });
  }

  const csvStock = row.mapped.stock ?? 0;
  if (csvStock !== snap.stock) {
    diffs.push({
      field: "stock",
      label: "Stock",
      before: String(snap.stock),
      after: String(csvStock),
    });
  }

  const csvCat = row.mapped.categorySlug?.trim() || null;
  if (csvCat && csvCat !== snap.category) {
    const beforeLabel = categoryLabel ? categoryLabel(snap.category) : snap.category;
    const afterLabel = categoryLabel ? categoryLabel(csvCat) : csvCat;
    diffs.push({
      field: "category",
      label: "Categoría",
      before: beforeLabel || snap.category,
      after: afterLabel || csvCat,
    });
  }

  const csvSub = row.mapped.subcategoryName
    ? normalizeTaxonomyNameForDb(row.mapped.subcategoryName)
    : null;
  const dbSub = normalizeTaxonomyNameForDb(snap.subcategory);
  if (csvSub && csvSub !== dbSub) {
    diffs.push({
      field: "subcategory",
      label: "Subcategoría",
      before: snap.subcategory || "—",
      after: csvSub,
    });
  }

  const csvTags = (row.mapped.tags ?? []).map((t) => t.trim()).filter(Boolean);
  if (tagsKey(csvTags) !== tagsKey(snap.tags ?? [])) {
    diffs.push({
      field: "tags",
      label: "Etiquetas",
      before: formatTags(snap.tags ?? []),
      after: formatTags(csvTags),
    });
  }

  const csvBars = normText(row.mapped.variantGroupCode);
  const dbBars = normText(snap.variantGroupCode);
  if (csvBars && csvBars !== dbBars) {
    diffs.push({
      field: "variantGroupCode",
      label: "Barras",
      before: dbBars || "—",
      after: csvBars,
    });
  }

  const csvColor = normText(row.mapped.colorHex).toUpperCase();
  const dbColor = normText(snap.colorHex).toUpperCase();
  if (csvColor && csvColor !== dbColor) {
    diffs.push({
      field: "colorHex",
      label: "Color",
      before: dbColor || "—",
      after: csvColor,
    });
  }

  return diffs;
}

export function bulkRowHasUpdatableDiffs(row: BulkPreviewRow): boolean {
  return computeBulkRowFieldDiffs(row).length > 0;
}
