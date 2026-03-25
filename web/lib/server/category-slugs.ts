import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

export async function allocateUniqueCategorySlug(
  baseName: string,
  excludeCategoryId?: string
): Promise<string> {
  const base = slugify(baseName) || "categoria";
  let candidate = base;
  for (let n = 0; n < 10_000; n++) {
    const row = await prisma.category.findUnique({ where: { slug: candidate } });
    if (!row || row.id === excludeCategoryId) return candidate;
    candidate = `${base}-${n + 1}`;
  }
  throw new Error("No se pudo generar slug de categoría");
}

export async function allocateUniqueSubcategorySlug(
  categoryId: string,
  baseName: string,
  excludeSubcategoryId?: string
): Promise<string> {
  const base = slugify(baseName) || "subcategoria";
  let candidate = base;
  for (let n = 0; n < 10_000; n++) {
    const row = await prisma.subcategory.findFirst({
      where: { categoryId, slug: candidate },
    });
    if (!row || row.id === excludeSubcategoryId) return candidate;
    candidate = `${base}-${n + 1}`;
  }
  throw new Error("No se pudo generar slug de subcategoría");
}
