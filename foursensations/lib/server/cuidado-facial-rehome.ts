import type { PrismaClient } from "@prisma/client";
import {
  mapProagingSubToTarget,
  tagsFromSubcategoryMenu,
  type ProagingMigrationResult,
} from "@/lib/server/proaging-rehome";

/**
 * Reubica productos de la categoría legacy «Cuidado facial» → mismas reglas que Proaging
 * (destino principal: Cuidado piel y demás según subcategoría).
 * No toca imágenes.
 */
export async function runCuidadoFacialMigration(
  prisma: PrismaClient,
  opts: { dryRun: boolean }
): Promise<ProagingMigrationResult> {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { category: { equals: "cuidado-facial", mode: "insensitive" } },
        { category: { equals: "cuidado facial", mode: "insensitive" } },
      ],
    },
  });

  const preview: ProagingMigrationResult["preview"] = [];

  for (const p of products) {
    const target = mapProagingSubToTarget(p.subcategory);
    const tags = await tagsFromSubcategoryMenu(prisma, target.categorySlug, target.subcategoryName);
    preview.push({
      id: p.id,
      name: p.name,
      from: `${p.category} · ${p.subcategory}`,
      to: `${target.categorySlug} · ${target.subcategoryName}`,
    });
    if (opts.dryRun) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: {
        category: target.categorySlug,
        subcategory: target.subcategoryName,
        tags,
      },
    });
  }

  let categoriesDeleted = 0;
  if (!opts.dryRun) {
    const doomed = await prisma.category.findMany({
      where: {
        OR: [
          { slug: { equals: "cuidado-facial", mode: "insensitive" } },
          { slug: { equals: "cuidado facial", mode: "insensitive" } },
        ],
      },
    });
    for (const c of doomed) {
      await prisma.category.delete({ where: { id: c.id } });
      categoriesDeleted += 1;
    }
  }

  return {
    productsUpdated: opts.dryRun ? 0 : products.length,
    categoriesDeleted: opts.dryRun ? 0 : categoriesDeleted,
    dryRun: opts.dryRun,
    preview: preview.slice(0, 200),
    totalMatched: products.length,
  };
}
