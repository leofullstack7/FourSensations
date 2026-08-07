import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  CatalogActions,
  CatalogEntities,
  loadProductSnapshot,
  snapshotProduct,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 120;

const bulkPatchSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(2000),
    brand: z.string().trim().min(1).max(120).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    /** Actualizaciones individuales de stock (tienen prioridad sobre `stock`). */
    stockById: z.record(z.string(), z.coerce.number().int().min(0)).optional(),
  })
  .refine((v) => v.brand !== undefined || v.stock !== undefined || (v.stockById && Object.keys(v.stockById).length > 0), {
    message: "Indica brand, stock o stockById",
  });

/**
 * Actualiza brand y/o stock en lote (p. ej. productos con precio 0).
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bulkPatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const ids = Array.from(new Set(parsed.data.ids));
  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { images: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  const updated: ReturnType<typeof prismaProductToAdmin>[] = [];
  const versionChanges: Parameters<typeof recordCatalogVersionSafe>[0]["changes"] = [];
  let updatedCount = 0;

  for (const id of ids) {
    const existing = byId.get(id);
    if (!existing) continue;

    const data: { brand?: string; stock?: number } = {};
    if (parsed.data.brand !== undefined) data.brand = parsed.data.brand;
    if (parsed.data.stockById && Object.prototype.hasOwnProperty.call(parsed.data.stockById, id)) {
      data.stock = parsed.data.stockById[id];
    } else if (parsed.data.stock !== undefined) {
      data.stock = parsed.data.stock;
    }
    if (Object.keys(data).length === 0) continue;

    const before = await loadProductSnapshot(id);
    const row = await prisma.product.update({
      where: { id },
      data,
      include: { images: true },
    });
    updated.push(prismaProductToAdmin(row));
    updatedCount += 1;
    versionChanges.push({
      entityType: CatalogEntities.PRODUCT,
      entityId: row.id,
      action: CatalogActions.UPDATE,
      label: `Producto: ${row.name}`,
      beforeData: before,
      afterData: snapshotProduct(row),
    });
  }

  if (updatedCount > 0) {
    revalidateStorefrontProducts();
    const parts: string[] = [];
    if (parsed.data.brand !== undefined) parts.push(`marca «${parsed.data.brand}»`);
    if (parsed.data.stock !== undefined || parsed.data.stockById) parts.push("stock");
    await recordCatalogVersionSafe({
      label: `Actualización en lote (${updatedCount}): ${parts.join(" · ") || "campos"}`,
      changes: versionChanges,
    });
  }

  return NextResponse.json({
    updated: updatedCount,
    products: updated,
  });
}
