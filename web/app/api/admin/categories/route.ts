import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { allocateUniqueCategorySlug } from "@/lib/server/category-slugs";
import { revalidateStorefrontMenu } from "@/lib/server/revalidate-storefront-menu";
import { slugify } from "@/lib/slugify";
import { normalizeTaxonomyNameForDb } from "@/lib/taxonomy-display-name";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import {
  adminCategoryCreateSchema,
  formatZodError,
} from "@/lib/validation/admin-category";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapCategory(row: {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  subcategories: {
    id: string;
    slug: string;
    name: string;
    menuTag: string | null;
    sortOrder: number;
    categoryId: string;
  }[];
}): AdminCategoryTree {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    sortOrder: row.sortOrder,
    subcategories: row.subcategories.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      menuTag: s.menuTag,
      sortOrder: s.sortOrder,
      categoryId: s.categoryId,
    })),
  };
}

export async function GET() {
  try {
    const rows = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        subcategories: { orderBy: { sortOrder: "asc" } },
      },
    });
    return noStoreJson({
      categories: rows.map(mapCategory),
    });
  } catch (e) {
    console.error("[GET /api/admin/categories]", e);
    return noStoreJson({ error: "Error al listar categorías" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return noStoreJson({ error: "JSON inválido" }, { status: 400 });
    }
    const parsed = adminCategoryCreateSchema.safeParse(json);
    if (!parsed.success) {
      return noStoreJson(
        { error: formatZodError(parsed.error).message },
        { status: 400 }
      );
    }
    const data = parsed.data;
    let slug: string;
    if (data.slug) {
      slug = slugify(data.slug);
      const clash = await prisma.category.findUnique({ where: { slug } });
      if (clash) return noStoreJson({ error: "Slug de categoría ya existe" }, { status: 409 });
    } else {
      slug = await allocateUniqueCategorySlug(data.name);
    }

    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const agg = await prisma.category.aggregate({ _max: { sortOrder: true } });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    const row = await prisma.category.create({
      data: {
        name: normalizeTaxonomyNameForDb(data.name),
        slug,
        icon: data.icon ?? null,
        sortOrder,
      },
      include: { subcategories: { orderBy: { sortOrder: "asc" } } },
    });
    revalidateStorefrontMenu();
    return noStoreJson({ category: mapCategory(row) }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/categories]", e);
    return noStoreJson({ error: "Error al crear categoría" }, { status: 500 });
  }
}
