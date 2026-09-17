import { prisma } from "@/lib/prisma";
import { brandSlugFromName } from "@/lib/brand-display";
import { TINTES_CATEGORY_SLUG } from "@/lib/bulk-import/tintes";
import { normalizeTintCatalogName } from "@/lib/bulk-import/tint-catalog";
import {
  canonicalVariantGroupCode,
  variantGroupCodesMatch,
} from "@/lib/bulk-import/variant-group-code";
import { upsertProductFamilyByName, normalizeProductFamilyName } from "@/lib/server/product-family";
import { revalidateStorefrontAfterBrandChange } from "@/lib/server/revalidate-storefront-products";

type BrandTargetRow = {
  id: string;
  brand: string;
  category: string;
  tintFamilyId: string | null;
  variantGroupCode: string | null;
};

/**
 * Expande IDs a todos los hermanos de sus grupos de variantes,
 * para que al cambiar familia no quede ninguno en la marca anterior.
 */
export async function expandProductIdsToVariantSiblings(seedIds: string[]): Promise<string[]> {
  const uniqueSeeds = Array.from(new Set(seedIds.filter(Boolean)));
  if (uniqueSeeds.length === 0) return [];

  const seeds = await prisma.product.findMany({
    where: { id: { in: uniqueSeeds } },
    select: { id: true, variantGroupCode: true },
  });

  const groupCodes = Array.from(
    new Set(
      seeds
        .map((s) => canonicalVariantGroupCode(s.variantGroupCode))
        .filter((c): c is string => Boolean(c)),
    ),
  );

  if (groupCodes.length === 0) {
    return Array.from(new Set(seeds.map((s) => s.id)));
  }

  const rawCodes = Array.from(
    new Set(seeds.map((s) => s.variantGroupCode?.trim()).filter((c): c is string => Boolean(c))),
  );

  const candidates = await prisma.product.findMany({
    where: {
      OR: [
        { variantGroupCode: { in: groupCodes } },
        ...(rawCodes.length > 0 ? [{ variantGroupCode: { in: rawCodes } }] : []),
      ],
    },
    select: { id: true, variantGroupCode: true },
  });

  const byId = new Set(seeds.map((s) => s.id));
  for (const row of candidates) {
    const code = canonicalVariantGroupCode(row.variantGroupCode);
    if (!code) continue;
    if (!groupCodes.some((gc) => variantGroupCodesMatch(gc, code))) continue;
    byId.add(row.id);
  }
  return Array.from(byId);
}

async function resolveTintFamilyIdForBrand(brandName: string): Promise<string> {
  const name = normalizeTintCatalogName(brandName);
  const row = await prisma.tintFamily.upsert({
    where: { name },
    create: { name },
    update: {},
    select: { id: true },
  });
  return row.id;
}

/**
 * Asigna una sola familia/marca a los productos (y a sus variantes hermanas).
 * En tintes también actualiza `tintFamilyId` para que el filtro de la tienda coincida.
 */
export async function applyProductBrandToIds(
  seedIds: string[],
  brandRaw: string,
): Promise<{ updatedIds: string[]; brand: string; previousBrands: string[]; categories: string[] }> {
  const brand = normalizeProductFamilyName(brandRaw);
  if (!brand) {
    throw new Error("El nombre de la familia no puede estar vacío");
  }

  await upsertProductFamilyByName(brand);

  const expandedIds = await expandProductIdsToVariantSiblings(seedIds);
  if (expandedIds.length === 0) {
    return { updatedIds: [], brand, previousBrands: [], categories: [] };
  }

  const rows: BrandTargetRow[] = await prisma.product.findMany({
    where: { id: { in: expandedIds } },
    select: {
      id: true,
      brand: true,
      category: true,
      tintFamilyId: true,
      variantGroupCode: true,
    },
  });

  const previousBrands = Array.from(
    new Set(rows.map((r) => r.brand.trim()).filter(Boolean)),
  );
  const categories = Array.from(new Set(rows.map((r) => r.category).filter(Boolean)));

  const needsTintFamily = rows.some(
    (r) => r.tintFamilyId != null || r.category === TINTES_CATEGORY_SLUG,
  );
  const tintFamilyId = needsTintFamily ? await resolveTintFamilyIdForBrand(brand) : null;

  const plainIds = rows
    .filter((r) => r.tintFamilyId == null && r.category !== TINTES_CATEGORY_SLUG)
    .map((r) => r.id);
  const tintIds = rows
    .filter((r) => r.tintFamilyId != null || r.category === TINTES_CATEGORY_SLUG)
    .map((r) => r.id);

  if (plainIds.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: plainIds } },
      data: { brand },
    });
  }
  if (tintIds.length > 0 && tintFamilyId) {
    await prisma.product.updateMany({
      where: { id: { in: tintIds } },
      data: { brand, tintFamilyId },
    });
  }

  const oldSlugs = previousBrands
    .map((b) => brandSlugFromName(b))
    .filter((s): s is string => Boolean(s));
  const newSlug = brandSlugFromName(brand);

  revalidateStorefrontAfterBrandChange({
    brandSlugs: Array.from(new Set([...oldSlugs, ...(newSlug ? [newSlug] : [])])),
    categorySlugs: categories,
    includeTints: needsTintFamily || categories.includes(TINTES_CATEGORY_SLUG),
  });

  return {
    updatedIds: rows.map((r) => r.id),
    brand,
    previousBrands,
    categories,
  };
}
