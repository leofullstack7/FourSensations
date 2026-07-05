import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { allocateUniqueSubcategorySlug } from "@/lib/server/category-slugs";
import { revalidateStorefrontMenu } from "@/lib/server/revalidate-storefront-menu";
import { slugify } from "@/lib/slugify";
import type { AdminSubcategoryRow } from "@/lib/types/admin-category";
import {
  adminSubcategoryUpdateSchema,
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

export async function PUT(req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = params;
  try {
    const existing = await prisma.subcategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!existing) {
      return noStoreJson({ error: "Subcategoría no encontrada" }, { status: 404 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return noStoreJson({ error: "JSON inválido" }, { status: 400 });
    }
    const parsed = adminSubcategoryUpdateSchema.safeParse(json);
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

    const oldName = existing.name;
    let nextSlug = existing.slug;

    if (d.slug !== undefined) {
      const s = slugify(d.slug);
      const clash = await prisma.subcategory.findFirst({
        where: { categoryId: existing.categoryId, slug: s, NOT: { id } },
      });
      if (clash) return noStoreJson({ error: "Slug ya en uso en esta categoría" }, { status: 409 });
      nextSlug = s;
    } else if (d.name !== undefined && d.name !== existing.name) {
      nextSlug = await allocateUniqueSubcategorySlug(
        existing.categoryId,
        d.name,
        id
      );
    }

    const row = await prisma.$transaction(async (tx) => {
      if (d.name !== undefined && d.name !== oldName) {
        await tx.product.updateMany({
          where: {
            category: existing.category.slug,
            subcategory: oldName,
          },
          data: { subcategory: d.name },
        });
      }

      const updated = await tx.subcategory.update({
        where: { id },
        data: {
          ...(d.name !== undefined && { name: d.name }),
          ...(d.sortOrder !== undefined && { sortOrder: d.sortOrder }),
          ...(d.menuTag !== undefined && {
            menuTag:
              d.menuTag === null ? null : d.menuTag.trim() ? d.menuTag.trim() : null,
          }),
          slug: nextSlug,
        },
      });

      if (d.menuTag !== undefined) {
        const subName = d.name ?? oldName;
        const tag = (updated.menuTag?.trim() || "General").trim();
        const products = await tx.product.findMany({
          where: {
            category: existing.category.slug,
            subcategory: subName,
          },
          select: { id: true, tags: true },
        });
        for (const p of products) {
          const nextTags = [tag];
          const cur = p.tags ?? [];
          const same =
            cur.length === nextTags.length && cur.every((t, i) => t === nextTags[i]);
          if (same) continue;
          await tx.product.update({
            where: { id: p.id },
            data: { tags: nextTags },
          });
        }
      }

      return updated;
    });

    revalidateStorefrontMenu();
    return noStoreJson({ subcategory: mapSub(row) });
  } catch (e) {
    console.error("[PUT /api/admin/subcategories/[id]]", e);
    return noStoreJson({ error: "Error al actualizar subcategoría" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = params;
  try {
    const existing = await prisma.subcategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!existing) {
      return noStoreJson({ error: "Subcategoría no encontrada" }, { status: 404 });
    }
    const productCount = await prisma.product.count({
      where: {
        category: existing.category.slug,
        subcategory: existing.name,
      },
    });
    if (productCount > 0) {
      return noStoreJson(
        {
          error: `No se puede eliminar: hay ${productCount} producto(s) con esta subcategoría ("${existing.name}").`,
        },
        { status: 409 }
      );
    }
    await prisma.subcategory.delete({ where: { id } });
    revalidateStorefrontMenu();
    return new Response(null, { status: 204 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2025") {
      return noStoreJson({ error: "Subcategoría no encontrada" }, { status: 404 });
    }
    console.error("[DELETE /api/admin/subcategories/[id]]", e);
    return noStoreJson({ error: "Error al eliminar subcategoría" }, { status: 500 });
  }
}
