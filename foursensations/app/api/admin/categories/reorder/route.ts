import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { revalidateStorefrontMenu } from "@/lib/server/revalidate-storefront-menu";
import {
  CatalogActions,
  CatalogEntities,
  snapshotCategory,
  type CatalogChangeInput,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";
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
    const existing = await prisma.category.findMany();
    if (existing.length !== orderedIds.length) {
      return noStoreJson({ error: "Lista de IDs incompleta o inválida" }, { status: 400 });
    }
    const byId = new Map(existing.map((c) => [c.id, c]));
    if (orderedIds.some((id) => !byId.has(id))) {
      return noStoreJson({ error: "ID de categoría desconocido" }, { status: 400 });
    }

    const beforeById = new Map(existing.map((c) => [c.id, snapshotCategory(c)]));

    await prisma.$transaction(
      orderedIds.map((id, sortOrder) =>
        prisma.category.update({ where: { id }, data: { sortOrder } })
      )
    );

    const afterRows = await prisma.category.findMany({
      where: { id: { in: orderedIds } },
    });
    const changes: CatalogChangeInput[] = afterRows.flatMap((row) => {
      const before = beforeById.get(row.id);
      if (!before || before.sortOrder === row.sortOrder) return [];
      return [
        {
          entityType: CatalogEntities.CATEGORY,
          entityId: row.id,
          action: CatalogActions.UPDATE,
          label: `Categoría: ${row.name}`,
          beforeData: before,
          afterData: snapshotCategory(row),
        },
      ];
    });

    if (changes.length > 0) {
      await recordCatalogVersionSafe({
        label: "Reorden de categorías",
        summary: `Se reordenaron ${changes.length} categorías del menú.`,
        changes,
      });
    }

    revalidateStorefrontMenu();
    return noStoreJson({ ok: true });
  } catch (e) {
    console.error("[POST /api/admin/categories/reorder]", e);
    return noStoreJson({ error: "Error al reordenar categorías" }, { status: 500 });
  }
}
