import { prisma } from "@/lib/prisma";
import type { CategoryRow } from "@/lib/bulk-import/category-resolve";

export async function fetchCategoryTreeForImport(): Promise<CategoryRow[]> {
  const cats = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      subcategories: { orderBy: { sortOrder: "asc" } },
    },
  });
  return cats.map((c) => ({
    slug: c.slug,
    name: c.name,
    subcategories: c.subcategories.map((s) => ({ slug: s.slug, name: s.name })),
  }));
}
