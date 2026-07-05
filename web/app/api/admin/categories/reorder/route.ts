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
    const parsed = adminReorderSchema.safeParse(json);
    if (!parsed.success) {
      return noStoreJson(
        { error: formatZodError(parsed.error).message },
        { status: 400 }
      );
    }
    const { orderedIds } = parsed.data;
    const existing = await prisma.category.findMany({ select: { id: true } });
    if (existing.length !== orderedIds.length) {
      return noStoreJson({ error: "Lista de IDs incompleta o inválida" }, { status: 400 });
    }
    const idSet = new Set(existing.map((c) => c.id));
    if (orderedIds.some((id) => !idSet.has(id))) {
      return noStoreJson({ error: "ID de categoría desconocido" }, { status: 400 });
    }

    await prisma.$transaction(
      orderedIds.map((id, sortOrder) =>
        prisma.category.update({ where: { id }, data: { sortOrder } })
      )
    );
    revalidateStorefrontMenu();
    return noStoreJson({ ok: true });
  } catch (e) {
    console.error("[POST /api/admin/categories/reorder]", e);
    return noStoreJson({ error: "Error al reordenar categorías" }, { status: 500 });
  }
}
