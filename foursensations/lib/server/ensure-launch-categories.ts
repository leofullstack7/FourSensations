import { prisma } from "@/lib/prisma";
import { defaultMenuConfig, toCategorySlug } from "@/lib/menu-config";
import { slugify } from "@/lib/slugify";

/** Garantiza categorías de lanzamiento (p. ej. Cuidado Corporal, Kits) en DB para el admin. */
export async function ensureLaunchCategories(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const existing = await prisma.category.findMany({ select: { slug: true, id: true } });
    const bySlug = new Map(existing.map((c) => [c.slug, c.id]));
    let sortOrder = existing.length;

    for (const [name, cfg] of Object.entries(defaultMenuConfig)) {
      if (name === "Mayorista") continue;
      const slug = toCategorySlug(name);
      let categoryId = bySlug.get(slug);
      if (!categoryId) {
        const created = await prisma.category.create({
          data: {
            name,
            slug,
            icon: cfg.icon || null,
            sortOrder: sortOrder++,
          },
        });
        categoryId = created.id;
        bySlug.set(slug, categoryId);
      }

      const subNames = Object.keys(cfg.subs);
      if (subNames.length === 0) continue;
      const existingSubs = await prisma.subcategory.findMany({
        where: { categoryId },
        select: { name: true },
      });
      const have = new Set(existingSubs.map((s) => s.name.toLowerCase()));
      let subOrder = existingSubs.length;
      for (const subName of subNames) {
        if (have.has(subName.toLowerCase())) continue;
        await prisma.subcategory.create({
          data: {
            categoryId,
            name: subName,
            slug: slugify(subName),
            menuTag: subName,
            sortOrder: subOrder++,
          },
        });
      }
    }
  } catch (e) {
    console.error("[ensureLaunchCategories]", e);
  }
}
