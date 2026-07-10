import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { revalidateStorefrontMenu } from "@/lib/server/revalidate-storefront-menu";
import { normalizeTaxonomyNameForDb } from "@/lib/taxonomy-display-name";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Convierte categorías/subcategorías en MAYÚSCULAS al formato con mayúscula inicial. */
export async function POST() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const rows = await prisma.category.findMany({
      include: { subcategories: true },
    });

    let categoriesUpdated = 0;
    let subcategoriesUpdated = 0;
    let menuTagsUpdated = 0;
    let productsUpdated = 0;

    await prisma.$transaction(async (tx) => {
      for (const cat of rows) {
        const nextCatName = normalizeTaxonomyNameForDb(cat.name);
        if (nextCatName !== cat.name) {
          await tx.category.update({
            where: { id: cat.id },
            data: { name: nextCatName },
          });
          categoriesUpdated += 1;
        }

        for (const sub of cat.subcategories) {
          const nextSubName = normalizeTaxonomyNameForDb(sub.name);
          const nextMenuTag =
            sub.menuTag?.trim() ? normalizeTaxonomyNameForDb(sub.menuTag) : sub.menuTag;

          const subUpdates: { name?: string; menuTag?: string | null } = {};
          if (nextSubName !== sub.name) subUpdates.name = nextSubName;
          if (sub.menuTag?.trim() && nextMenuTag !== sub.menuTag) subUpdates.menuTag = nextMenuTag;

          if (Object.keys(subUpdates).length === 0) continue;

          if (subUpdates.name && subUpdates.name !== sub.name) {
            const r = await tx.product.updateMany({
              where: { category: cat.slug, subcategory: sub.name },
              data: { subcategory: subUpdates.name },
            });
            productsUpdated += r.count;
          }

          await tx.subcategory.update({
            where: { id: sub.id },
            data: subUpdates,
          });
          subcategoriesUpdated += 1;
          if (subUpdates.menuTag !== undefined) menuTagsUpdated += 1;
        }
      }
    });

    revalidateStorefrontMenu();

    return noStoreJson({
      categoriesUpdated,
      subcategoriesUpdated,
      menuTagsUpdated,
      productsUpdated,
    });
  } catch (e) {
    console.error("[POST /api/admin/categories/normalize-texts]", e);
    return noStoreJson({ error: "Error al normalizar textos" }, { status: 500 });
  }
}
