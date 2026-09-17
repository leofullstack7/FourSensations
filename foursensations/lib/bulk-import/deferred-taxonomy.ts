import type { BulkPreviewNewTaxonomyItem, BulkPreviewResult } from "@/lib/bulk-import/build-preview";
import { normalizeTaxonomyNameForDb } from "@/lib/bulk-import/category-resolve";
import { slugify } from "@/lib/slugify";

function normKey(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TAXONOMY_ISSUE_MARKERS = [
  "Categoría no reconocida",
  "Subcategoría CSV no reconocida en la categoría detectada",
] as const;

export function isDeferredTaxonomyIssue(issue: string): boolean {
  if (TAXONOMY_ISSUE_MARKERS.some((m) => issue === m)) return true;
  if (issue.startsWith("Categoría CSV «") && issue.includes("no reconocida")) return true;
  return false;
}

/** Tras aceptar el modal: placeholders + quitar bloqueos de taxonomía nueva. */
export function applyDeferredTaxonomyPlaceholders(preview: BulkPreviewResult): void {
  if (!preview.taxonomyCreateDeferred) return;
  const plan = preview.newCategories ?? [];
  if (plan.length === 0) return;

  const newCatByKey = new Map<string, Extract<BulkPreviewNewTaxonomyItem, { kind: "newCategory" }>>();
  const newSubsByParent = new Map<
    string,
    Extract<BulkPreviewNewTaxonomyItem, { kind: "newSubcategoriesOnly" }>
  >();
  for (const item of plan) {
    if (item.kind === "newCategory") newCatByKey.set(normKey(item.categoryName), item);
    else newSubsByParent.set(item.parentCategorySlug, item);
  }

  for (const row of preview.rows) {
    if (row.isExistingProduct) continue;
    const rawCat = (row.mapped.category ?? "").trim();
    const rawSub = (row.mapped.subcategory ?? "").trim();
    let changed = false;

    if (rawCat) {
      const planCat = newCatByKey.get(normKey(rawCat));
      if (planCat) {
        row.mapped.categorySlug = slugify(planCat.categoryName) || "categoria";
        if (rawSub) {
          row.mapped.subcategoryName = normalizeTaxonomyNameForDb(rawSub);
        } else if (planCat.subcategories[0]) {
          row.mapped.subcategoryName = planCat.subcategories[0];
        }
        changed = true;
      }
    }

    const slug = row.mapped.categorySlug;
    if (slug && rawSub) {
      const planSubs = newSubsByParent.get(slug);
      if (planSubs) {
        const want = normalizeTaxonomyNameForDb(rawSub);
        if (planSubs.subcategories.some((s) => normalizeTaxonomyNameForDb(s) === want)) {
          row.mapped.subcategoryName = want;
          changed = true;
        }
      }
    }

    if (changed || row.issues.some(isDeferredTaxonomyIssue)) {
      row.issues = row.issues.filter((x) => !isDeferredTaxonomyIssue(x));
    }
  }
}
