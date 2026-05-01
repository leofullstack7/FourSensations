import { unstable_cache } from "next/cache";
import type { MenuConfig } from "@/lib/types/admin";
import { defaultMenuConfig } from "@/lib/menu-config";
import { prisma } from "@/lib/prisma";

export type StorefrontMenuPayload = {
  config: MenuConfig;
  /** `category.name` → `category.slug` para URLs estables. */
  slugByCategoryName: Record<string, string>;
};

function menuFromDefault(): StorefrontMenuPayload {
  const slugByCategoryName: Record<string, string> = {};
  for (const name of Object.keys(defaultMenuConfig)) {
    slugByCategoryName[name] = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  return { config: defaultMenuConfig, slugByCategoryName };
}

/** Mega menú desde Prisma: categorías + subcategorías en una query; caché 1 h. */
const getCachedStorefrontCategoryMenu = unstable_cache(
  async (): Promise<StorefrontMenuPayload> => {
    const rows = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { subcategories: { orderBy: { sortOrder: "asc" } } },
    });
    if (rows.length === 0) return menuFromDefault();

    const out: MenuConfig = {};
    const slugByCategoryName: Record<string, string> = {};
    for (const c of rows) {
      const subsRecord: Record<string, string[]> = {};
      for (const s of c.subcategories) {
        const group = (s.menuTag?.trim() || "General").trim();
        if (!subsRecord[group]) subsRecord[group] = [];
        subsRecord[group].push(s.name);
      }
      out[c.name] = {
        icon: c.icon ?? "📦",
        subs: subsRecord,
      };
      slugByCategoryName[c.name] = c.slug;
    }
    return { config: out, slugByCategoryName };
  },
  ["storefront-category-menu-v1"],
  { revalidate: 3600 }
);

/**
 * Mega menú desde Prisma (subcategorías y `menuTag` = columnas del menú).
 * Si no hay DB o tabla vacía, usa `defaultMenuConfig`.
 */
export async function getStorefrontCategoryMenu(): Promise<StorefrontMenuPayload> {
  if (!process.env.DATABASE_URL) return menuFromDefault();
  try {
    return await getCachedStorefrontCategoryMenu();
  } catch {
    return menuFromDefault();
  }
}

export type StoreCategoryWithSubs = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  subcategories: { name: string; menuTag: string | null; slug: string; sortOrder: number }[];
};

/** Categoría por slug: findUnique + subs en una query; caché 5 min (misma cadencia que la página /categoria). */
export async function getStorefrontCategoryBySlug(slug: string): Promise<StoreCategoryWithSubs | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    return await unstable_cache(
      async () => {
        const row = await prisma.category.findUnique({
          where: { slug },
          include: { subcategories: { orderBy: { sortOrder: "asc" } } },
        });
        if (!row) return null;
        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          icon: row.icon,
          sortOrder: row.sortOrder,
          subcategories: row.subcategories.map((s) => ({
            name: s.name,
            menuTag: s.menuTag,
            slug: s.slug,
            sortOrder: s.sortOrder,
          })),
        };
      },
      ["storefront-category-by-slug", slug],
      { revalidate: 300 }
    )();
  } catch {
    return null;
  }
}
