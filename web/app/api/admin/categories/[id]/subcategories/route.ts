import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { allocateUniqueSubcategorySlug } from "@/lib/server/category-slugs";
import { revalidateStorefrontMenu } from "@/lib/server/revalidate-storefront-menu";
import { slugify } from "@/lib/slugify";
import type { AdminSubcategoryRow } from "@/lib/types/admin-category";
import {
  adminSubcategoryCreateSchema,
  formatZodError,
} from "@/lib/validation/admin-category";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function mapSub(s: {
  id: string;
  slug: string;
  name: string;
  menuTag: string | null;
  sortOrder: number;
  categoryId: string;
}): AdminSubcategoryRow {
  return {
    id: s.id,
    slug: s.slug,
    name: s.name,
    menuTag: s.menuTag,
    sortOrder: s.sortOrder,
    categoryId: s.categoryId,
  };
}

type RouteCtx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const categoryId = params.id;
  try {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) return noStoreJson({ error: "Categoría no encontrada" }, { status: 404 });

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return noStoreJson({ error: "JSON inválido" }, { status: 400 });
    }
    const parsed = adminSubcategoryCreateSchema.safeParse(json);
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
      const clash = await prisma.subcategory.findFirst({
        where: { categoryId, slug },
      });
      if (clash) {
        return noStoreJson({ error: "Slug de subcategoría ya existe en esta categoría" }, { status: 409 });
      }
    } else {
      slug = await allocateUniqueSubcategorySlug(categoryId, data.name);
    }

    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const agg = await prisma.subcategory.aggregate({
        where: { categoryId },
        _max: { sortOrder: true },
      });
      sortOrder = (agg._max.sortOrder ?? -1) + 1;
    }

    const menuTag =
      data.menuTag === undefined
        ? null
        : data.menuTag === null
          ? null
          : data.menuTag.trim() || null;

    const row = await prisma.subcategory.create({
      data: {
        categoryId,
        name: data.name,
        slug,
        sortOrder,
        menuTag,
      },
    });
    revalidateStorefrontMenu();
    return noStoreJson({ subcategory: mapSub(row) }, { status: 201 });
  } catch (e) {
    console.error("[POST .../subcategories]", e);
    return noStoreJson({ error: "Error al crear subcategoría" }, { status: 500 });
  }
}
