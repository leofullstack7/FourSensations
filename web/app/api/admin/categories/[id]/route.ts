import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { allocateUniqueCategorySlug } from "@/lib/server/category-slugs";
import { slugify } from "@/lib/slugify";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import {
  adminCategoryUpdateSchema,
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
      sortOrder: s.sortOrder,
      categoryId: s.categoryId,
    })),
  };
}

type RouteCtx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { id } = params;
  try {
    const row = await prisma.category.findUnique({
      where: { id },
      include: { subcategories: { orderBy: { sortOrder: "asc" } } },
    });
    if (!row) return noStoreJson({ error: "Categoría no encontrada" }, { status: 404 });
    return noStoreJson({ category: mapCategory(row) });
  } catch (e) {
    console.error("[GET /api/admin/categories/[id]]", e);
    return noStoreJson({ error: "Error al obtener categoría" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteCtx) {
  const { id } = params;
  try {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return noStoreJson({ error: "Categoría no encontrada" }, { status: 404 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return noStoreJson({ error: "JSON inválido" }, { status: 400 });
    }
    const parsed = adminCategoryUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return noStoreJson(
        { error: formatZodError(parsed.error).message },
        { status: 400 }
      );
    }
    const d = parsed.data;
    if (Object.keys(d).length === 0) {
      return noStoreJson({ error: "Sin campos para actualizar" }, { status: 400 });
    }

    let nextSlug = existing.slug;
    if (d.slug !== undefined) {
      const s = slugify(d.slug);
      const clash = await prisma.category.findFirst({
        where: { slug: s, NOT: { id } },
      });
      if (clash) return noStoreJson({ error: "Slug ya en uso" }, { status: 409 });
      nextSlug = s;
    } else if (d.name !== undefined && d.name !== existing.name) {
      nextSlug = await allocateUniqueCategorySlug(d.name, id);
    }

    const oldSlug = existing.slug;
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id },
        data: {
          ...(d.name !== undefined && { name: d.name }),
          ...(d.icon !== undefined && { icon: d.icon }),
          ...(d.sortOrder !== undefined && { sortOrder: d.sortOrder }),
          slug: nextSlug,
        },
        include: { subcategories: { orderBy: { sortOrder: "asc" } } },
      });
      if (nextSlug !== oldSlug) {
        await tx.product.updateMany({
          where: { category: oldSlug },
          data: { category: nextSlug },
        });
      }
      return updated;
    });

    return noStoreJson({ category: mapCategory(row) });
  } catch (e) {
    console.error("[PUT /api/admin/categories/[id]]", e);
    return noStoreJson({ error: "Error al actualizar categoría" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = params;
  try {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return noStoreJson({ error: "Categoría no encontrada" }, { status: 404 });
    }
    const productCount = await prisma.product.count({
      where: { category: existing.slug },
    });
    if (productCount > 0) {
      return noStoreJson(
        {
          error: `No se puede eliminar: hay ${productCount} producto(s) con esta categoría (slug "${existing.slug}").`,
        },
        { status: 409 }
      );
    }
    await prisma.category.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2025") {
      return noStoreJson({ error: "Categoría no encontrada" }, { status: 404 });
    }
    console.error("[DELETE /api/admin/categories/[id]]", e);
    return noStoreJson({ error: "Error al eliminar categoría" }, { status: 500 });
  }
}
