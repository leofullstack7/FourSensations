import type { PrismaClient } from "@prisma/client";
import type { BulkPreviewResult } from "@/lib/bulk-import/build-preview";
import { buildPreviewNewTaxonomyItems } from "@/lib/bulk-import/build-preview";
import type { BulkExistingSnapshot } from "@/lib/bulk-import/bulk-field-diff";
import type { BulkPreviewDbVariant } from "@/lib/bulk-import/variant-groups-preview";
import {
  applyVariantGroupsToPreview,
  dbVariantsByGroupFromProducts,
  normalizedVariantGroupKey,
} from "@/lib/bulk-import/variant-groups-preview";
import {
  canonicalExternalRef,
  canonicalVariantGroupCode,
  variantGroupCodesMatch,
} from "@/lib/bulk-import/variant-group-code";
import { fetchCategoryTreeForImport } from "@/lib/server/admin-category-tree";

/**
 * Marca filas existentes por `externalRef`, enriquece grupos de barras y snapshot para diff.
 */
export async function enrichBulkPreviewFromDatabase(
  prisma: Pick<PrismaClient, "product">,
  preview: BulkPreviewResult
): Promise<void> {
  const codes = new Set<string>();
  const groupKeys = new Set<string>();
  for (const r of preview.rows) {
    r.existingSnapshot = null;
    if (r.normalizedCode) codes.add(r.normalizedCode);
    const gk = normalizedVariantGroupKey(r.mapped.variantGroupCode);
    if (gk) groupKeys.add(gk);
  }

  if (codes.size === 0) {
    preview.stats.existingProductRows = 0;
    applyVariantGroupsToPreview(preview, new Map());
    return;
  }

  const existingByRef = await prisma.product.findMany({
    where: { externalRef: { not: null } },
    select: {
      id: true,
      name: true,
      brand: true,
      description: true,
      price: true,
      originalPrice: true,
      stock: true,
      category: true,
      subcategory: true,
      tags: true,
      externalRef: true,
      variantGroupCode: true,
      variantGroupOrder: true,
      imageUrl: true,
      colorHex: true,
      colorName: true,
    },
  });

  const byRef = new Map<
    string,
    {
      id: string;
      name: string;
      variantGroupCode: string | null;
      variantGroupOrder: number | null;
      snapshot: BulkExistingSnapshot;
    }
  >();
  for (const p of existingByRef) {
    const refKey = canonicalExternalRef(p.externalRef);
    if (!refKey || !codes.has(refKey)) continue;
    byRef.set(refKey, {
      id: p.id,
      name: p.name,
      variantGroupCode: p.variantGroupCode,
      variantGroupOrder: p.variantGroupOrder,
      snapshot: {
        name: p.name,
        brand: p.brand,
        description: p.description,
        price: p.price,
        originalPrice: p.originalPrice,
        stock: p.stock,
        category: p.category,
        subcategory: p.subcategory,
        tags: p.tags ?? [],
        imageUrl: p.imageUrl,
        variantGroupCode: p.variantGroupCode,
        colorHex: p.colorHex,
        colorName: p.colorName,
      },
    });
  }

  let marked = 0;
  for (const row of preview.rows) {
    row.existingVariantGroupCode = null;
    row.existingVariantGroupOrder = null;
    row.existingSnapshot = null;

    const ref = row.normalizedCode;
    if (!ref) continue;
    const hit = byRef.get(ref);
    if (!hit) continue;

    row.isExistingProduct = true;
    row.existingProductId = hit.id;
    row.existingProductName = hit.name;
    row.existingVariantGroupCode = hit.variantGroupCode;
    row.existingVariantGroupOrder = hit.variantGroupOrder;
    row.existingSnapshot = hit.snapshot;

    if (!row.issues.includes("Producto ya registrado")) {
      row.issues.push("Producto ya registrado");
    }

    const csvGroup = normalizedVariantGroupKey(row.mapped.variantGroupCode);
    const dbGroup = canonicalVariantGroupCode(hit.variantGroupCode);
    if (csvGroup && dbGroup && !variantGroupCodesMatch(csvGroup, dbGroup)) {
      const msg = "Código de barras distinto al registrado en tienda";
      if (!row.issues.includes(msg)) row.issues.push(msg);
    }

    row.selected = false;
    marked += 1;
  }

  preview.stats.existingProductRows = marked;

  let dbByGroup = new Map<string, BulkPreviewDbVariant[]>();
  if (groupKeys.size > 0) {
    const inGroups = await prisma.product.findMany({
      where: { variantGroupCode: { not: null } },
      select: {
        id: true,
        name: true,
        externalRef: true,
        variantGroupCode: true,
        variantGroupOrder: true,
        imageUrl: true,
      },
    });
    const filtered = inGroups.filter((p) => {
      const key = canonicalVariantGroupCode(p.variantGroupCode);
      return key != null && groupKeys.has(key);
    });
    dbByGroup = dbVariantsByGroupFromProducts(filtered);
  }

  applyVariantGroupsToPreview(preview, dbByGroup);

  const categoryTree = await fetchCategoryTreeForImport();
  preview.newCategories = buildPreviewNewTaxonomyItems(preview.rows, categoryTree, {
    excludeExistingProducts: true,
  });
}

/** @deprecated Usar enrichBulkPreviewFromDatabase */
export async function markBulkPreviewExistingByExternalRef(
  prisma: Pick<PrismaClient, "product">,
  preview: BulkPreviewResult
): Promise<void> {
  await enrichBulkPreviewFromDatabase(prisma, preview);
}
