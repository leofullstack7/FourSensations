import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  CatalogActions,
  CatalogEntities,
  snapshotProduct,
  type CatalogChangeInput,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";
import {
  adminProductBulkDeleteSchema,
  formatZodError,
} from "@/lib/validation/admin-product";

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = adminProductBulkDeleteSchema.safeParse(json);
  if (!parsed.success) {
    const { message, issues } = formatZodError(parsed.error);
    return NextResponse.json({ error: message, details: issues }, { status: 400 });
  }

  const body = parsed.data;

  try {
    if (body.mode === "all") {
      const rows = await prisma.product.findMany({ include: { images: true } });
      const r = await prisma.product.deleteMany({});
      if (rows.length > 0) {
        const changes: CatalogChangeInput[] = rows.map((row) => ({
          entityType: CatalogEntities.PRODUCT,
          entityId: row.id,
          action: CatalogActions.DELETE,
          label: `Producto: ${row.name}`,
          beforeData: snapshotProduct(row),
          afterData: null,
        }));
        await recordCatalogVersionSafe({
          label: `Eliminación masiva: ${rows.length} productos`,
          summary: `Se eliminaron todos los productos del catálogo (${rows.length}).`,
          changes,
        });
      }
      return NextResponse.json({ deleted: r.count });
    }

    const uniqueIds = Array.from(new Set(body.ids));
    const rows = await prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      include: { images: true },
    });
    const r = await prisma.product.deleteMany({
      where: { id: { in: uniqueIds } },
    });
    if (rows.length > 0) {
      await recordCatalogVersionSafe({
        label: `Eliminación masiva: ${rows.length} productos`,
        summary: `Se eliminaron ${rows.length} productos seleccionados.`,
        changes: rows.map((row) => ({
          entityType: CatalogEntities.PRODUCT,
          entityId: row.id,
          action: CatalogActions.DELETE,
          label: `Producto: ${row.name}`,
          beforeData: snapshotProduct(row),
          afterData: null,
        })),
      });
    }
    return NextResponse.json({ deleted: r.count });
  } catch (e) {
    console.error("[POST /api/admin/products/bulk-delete]", e);
    return NextResponse.json({ error: "Error al eliminar productos" }, { status: 500 });
  }
}
