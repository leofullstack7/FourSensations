import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { revalidateStorefrontMenu } from "@/lib/server/revalidate-storefront-menu";
import {
  adminReorderSchema,
  formatZodError,
} from "@/lib/validation/admin-category";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteCtx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteCtx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const categoryId = params.id;
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { subcategories: { select: { id: true } } },
    });
    if (!category) {
      return noStoreJson({ error: "Categoría no encontrada" }, { status: 404 });
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return noStoreJson({ error: "JSON inválido" }, { status: 400 });
    }
    const parsed = adminReorderSchema.safeParse(json);
    if (!parsed.success) {
      return noStoreJson(
        { error: formatZodError(parsed.error).message },
        { status: 400 }
      );
    }
    const { orderedIds } = parsed.data;
    if (category.subcategories.length !== orderedIds.length) {
      return noStoreJson({ error: "Lista de IDs incompleta o inválida" }, { status: 400 });
    }
    const idSet = new Set(category.subcategories.map((s) => s.id));
    if (orderedIds.some((id) => !idSet.has(id))) {
      return noStoreJson({ error: "ID de subcategoría desconocido" }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((id, sortOrder) =>
        prisma.subcategory.update({ where: { id }, data: { sortOrder } })
      )
    );
    revalidateStorefrontMenu();
    return noStoreJson({ ok: true });
  } catch (e) {
    console.error("[POST /api/admin/categories/[id]/subcategories/reorder]", e);
    return noStoreJson({ error: "Error al reordenar subcategorías" }, { status: 500 });
  }
}
