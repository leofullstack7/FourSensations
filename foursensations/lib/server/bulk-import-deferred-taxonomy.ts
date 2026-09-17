import type { PrismaClient } from "@prisma/client";
import type { BulkPreviewResult, BulkPreviewRow } from "@/lib/bulk-import/build-preview";
import { normalizeTaxonomyNameForDb } from "@/lib/bulk-import/category-resolve";
import { normalizeTintCatalogName } from "@/lib/bulk-import/tint-catalog";
import {
  allocateUniqueCategorySlug,
  allocateUniqueSubcategorySlug,
} from "@/lib/server/category-slugs";
import { upsertTintCatalogEntries } from "@/lib/server/tint-catalog-db";
import {
  CatalogActions,
  CatalogEntities,
  snapshotCategory,
  snapshotSubcategory,
  type CatalogChangeInput,
} from "@/lib/server/catalog-versioning";

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

export type DeferredTaxonomyEnsureResult = {
  categorySlugByCsvKey: Map<string, string>;
  versionChanges: CatalogChangeInput[];
  createdCategories: number;
  createdSubcategories: number;
};

/**
 * Crea en DB categorías/subcategorías pendientes del plan diferido.
 * Solo corre en commit cuando taxonomyCreateDeferred === true.
 */
export async function ensureDeferredCategoriesOnCommit(
  prisma: PrismaClient,
  preview: BulkPreviewResult
): Promise<DeferredTaxonomyEnsureResult> {
  const categorySlugByCsvKey = new Map<string, string>();
  const versionChanges: CatalogChangeInput[] = [];
  let createdCategories = 0;
  let createdSubcategories = 0;

  if (!preview.taxonomyCreateDeferred) {
    return { categorySlugByCsvKey, versionChanges, createdCategories, createdSubcategories };
  }

  const plan = preview.newCategories ?? [];
  const tree = await prisma.category.findMany({
    include: { subcategories: true },
    orderBy: { sortOrder: "asc" },
  });

  const findCat = (nameOrSlug: string) => {
    const k = normKey(nameOrSlug);
    return tree.find((c) => normKey(c.name) === k || normKey(c.slug) === k) ?? null;
  };

  for (const item of plan) {
    if (item.kind === "newCategory") {
      let parent = findCat(item.categoryName);
      if (!parent) {
        const name = normalizeTaxonomyNameForDb(item.categoryName);
        const slug = await allocateUniqueCategorySlug(name);
        const maxOrder = tree.reduce((m, c) => Math.max(m, c.sortOrder), -1);
        parent = await prisma.category.create({
          data: { name, slug, sortOrder: maxOrder + 1 },
          include: { subcategories: true },
        });
        tree.push(parent);
        createdCategories += 1;
        versionChanges.push({
          entityType: CatalogEntities.CATEGORY,
          entityId: parent.id,
          action: CatalogActions.CREATE,
          label: `Categoría: ${parent.name}`,
          beforeData: null,
          afterData: snapshotCategory(parent),
        });
      }
      categorySlugByCsvKey.set(normKey(item.categoryName), parent.slug);

      for (const subNameRaw of item.subcategories) {
        const subDbName = normalizeTaxonomyNameForDb(subNameRaw);
        const exists = parent.subcategories.some(
          (s) =>
            normalizeTaxonomyNameForDb(s.name) === subDbName || normKey(s.slug) === normKey(subNameRaw)
        );
        if (exists) continue;
        const subSlug = await allocateUniqueSubcategorySlug(parent.id, subDbName);
        const maxSub = parent.subcategories.reduce((m, s) => Math.max(m, s.sortOrder), -1);
        const sub = await prisma.subcategory.create({
          data: {
            name: subDbName,
            slug: subSlug,
            categoryId: parent.id,
            sortOrder: maxSub + 1,
          },
        });
        parent.subcategories.push(sub);
        createdSubcategories += 1;
        versionChanges.push({
          entityType: CatalogEntities.SUBCATEGORY,
          entityId: sub.id,
          action: CatalogActions.CREATE,
          label: `Subcategoría: ${parent.name} / ${sub.name}`,
          beforeData: null,
          afterData: snapshotSubcategory(sub),
        });
      }
    } else {
      const parent =
        tree.find((c) => c.slug === item.parentCategorySlug) ?? findCat(item.parentCategoryName);
      if (!parent) continue;
      categorySlugByCsvKey.set(normKey(item.parentCategoryName), parent.slug);
      categorySlugByCsvKey.set(normKey(item.parentCategorySlug), parent.slug);

      for (const subNameRaw of item.subcategories) {
        const subDbName = normalizeTaxonomyNameForDb(subNameRaw);
        const exists = parent.subcategories.some(
          (s) =>
            normalizeTaxonomyNameForDb(s.name) === subDbName || normKey(s.slug) === normKey(subNameRaw)
        );
        if (exists) continue;
        const subSlug = await allocateUniqueSubcategorySlug(parent.id, subDbName);
        const maxSub = parent.subcategories.reduce((m, s) => Math.max(m, s.sortOrder), -1);
        const sub = await prisma.subcategory.create({
          data: {
            name: subDbName,
            slug: subSlug,
            categoryId: parent.id,
            sortOrder: maxSub + 1,
          },
        });
        parent.subcategories.push(sub);
        createdSubcategories += 1;
        versionChanges.push({
          entityType: CatalogEntities.SUBCATEGORY,
          entityId: sub.id,
          action: CatalogActions.CREATE,
          label: `Subcategoría: ${parent.name} / ${sub.name}`,
          beforeData: null,
          afterData: snapshotSubcategory(sub),
        });
      }
    }
  }

  return { categorySlugByCsvKey, versionChanges, createdCategories, createdSubcategories };
}

/** Resuelve categorySlug real para una fila tras crear taxonomía diferida. */
export function remapRowCategoryAfterDeferredCreate(
  row: BulkPreviewRow,
  categorySlugByCsvKey: Map<string, string>
): { categorySlug: string | null; subcategoryName: string | null } {
  const rawCat = (row.mapped.category ?? "").trim();
  let categorySlug = row.mapped.categorySlug;
  if (rawCat) {
    const mapped = categorySlugByCsvKey.get(normKey(rawCat));
    if (mapped) categorySlug = mapped;
  }
  const subcategoryName = row.mapped.subcategoryName
    ? normalizeTaxonomyNameForDb(row.mapped.subcategoryName)
    : null;
  return { categorySlug, subcategoryName };
}

export type TintIdsForCommit = {
  activeTintTypeId: string | null;
  activeTintFamilyId: string | null;
  tintTypeOverrides: Record<string, string>;
};

export const PENDING_TINT_OVERRIDE_PREFIX = "__pending__:";

export function encodePendingTintTypeOverride(typeName: string): string {
  return `${PENDING_TINT_OVERRIDE_PREFIX}${normalizeTintCatalogName(typeName)}`;
}

export function parsePendingTintTypeOverride(value: string): string | null {
  if (!value.startsWith(PENDING_TINT_OVERRIDE_PREFIX)) return null;
  return value.slice(PENDING_TINT_OVERRIDE_PREFIX.length) || null;
}

/**
 * Crea tipos/familias de tinte pendientes y resuelve IDs para el commit.
 */
export async function ensureTintCatalogOnCommit(
  prisma: PrismaClient,
  preview: BulkPreviewResult
): Promise<TintIdsForCommit> {
  const pendingTypeNames = new Set<string>();
  const pendingFamilyNames = new Set<string>();

  if (preview.activeTintTypeCsvKey && !preview.activeTintTypeId) {
    pendingTypeNames.add(normalizeTintCatalogName(preview.activeTintTypeCsvKey));
  }
  if (preview.activeTintFamilyCsvKey && !preview.activeTintFamilyId) {
    pendingFamilyNames.add(normalizeTintCatalogName(preview.activeTintFamilyCsvKey));
  }

  const overridesIn = preview.tintTypeOverrides ?? {};
  for (const value of Object.values(overridesIn)) {
    const pending = parsePendingTintTypeOverride(value);
    if (pending) pendingTypeNames.add(pending);
  }

  if (pendingTypeNames.size > 0 || pendingFamilyNames.size > 0) {
    await upsertTintCatalogEntries(prisma, {
      newTypes: Array.from(pendingTypeNames),
      newFamilies: Array.from(pendingFamilyNames),
    });
  }

  const catalog = await upsertTintCatalogEntries(prisma, {});
  const findType = (name: string | null | undefined) => {
    if (!name) return null;
    const key = normalizeTintCatalogName(name);
    return catalog.types.find((t) => normalizeTintCatalogName(t.name) === key)?.id ?? null;
  };
  const findFamily = (name: string | null | undefined) => {
    if (!name) return null;
    const key = normalizeTintCatalogName(name);
    return catalog.families.find((f) => normalizeTintCatalogName(f.name) === key)?.id ?? null;
  };

  let activeTintTypeId = preview.activeTintTypeId;
  let activeTintFamilyId = preview.activeTintFamilyId;
  if (!activeTintTypeId && preview.activeTintTypeCsvKey) {
    activeTintTypeId =
      preview.tintTypeLinks?.[preview.activeTintTypeCsvKey] ?? findType(preview.activeTintTypeCsvKey);
  }
  if (!activeTintFamilyId && preview.activeTintFamilyCsvKey) {
    activeTintFamilyId =
      preview.tintFamilyLinks?.[preview.activeTintFamilyCsvKey] ??
      findFamily(preview.activeTintFamilyCsvKey);
  }

  const tintTypeOverrides: Record<string, string> = {};
  for (const [rowId, value] of Object.entries(overridesIn)) {
    const pending = parsePendingTintTypeOverride(value);
    if (pending) {
      const id = findType(pending);
      if (id) tintTypeOverrides[rowId] = id;
    } else {
      tintTypeOverrides[rowId] = value;
    }
  }

  return { activeTintTypeId, activeTintFamilyId, tintTypeOverrides };
}
