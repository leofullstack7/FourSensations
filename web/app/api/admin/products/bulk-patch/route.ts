import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  CatalogActions,
  CatalogEntities,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const bulkPatchSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(500),
    brand: z.string().trim().min(1).max(120).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    /** Actualizaciones individuales de stock (tienen prioridad sobre `stock`). */
    stockById: z.record(z.string(), z.coerce.number().int().min(0)).optional(),
    /** Si false, no escribe versión (útil en lotes intermedios). */
    recordVersion: z.boolean().optional().default(true),
    /** Etiqueta opcional para el resumen de versión. */
    versionLabel: z.string().max(200).optional(),
  })
  .refine(
    (v) =>
      v.brand !== undefined ||
      v.stock !== undefined ||
      (v.stockById && Object.keys(v.stockById).length > 0),
    { message: "Indica brand, stock o stockById" }
  );

/**
 * Actualiza brand y/o stock en lote (rápido con updateMany).
 * Pensado para enviarse en chunks desde el cliente con barra de avance.
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

  const patch = parsed.data;
  const ids = Array.from(new Set(patch.ids));
  let updatedCount = 0;

  // Marca uniforme: una sola query.
  if (patch.brand !== undefined && !patch.stockById && patch.stock === undefined) {
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { brand: patch.brand },
    });
    updatedCount = result.count;
  } else if (patch.stock !== undefined && patch.brand === undefined && !patch.stockById) {
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { stock: patch.stock },
    });
    updatedCount = result.count;
  } else if (patch.stockById && patch.brand === undefined) {
    // Agrupar por valor de stock → updateMany por grupo (mucho más rápido).
    const byStock = new Map<number, string[]>();
    for (const id of ids) {
      if (!Object.prototype.hasOwnProperty.call(patch.stockById, id)) continue;
      const stock = patch.stockById[id]!;
      const list = byStock.get(stock) ?? [];
      list.push(id);
      byStock.set(stock, list);
    }
    for (const [stock, groupIds] of byStock) {
      const result = await prisma.product.updateMany({
        where: { id: { in: groupIds } },
        data: { stock },
      });
      updatedCount += result.count;
    }
  } else {
    // brand + stock / stockById mezclado: update por id en paralelo limitado.
    const CONCURRENCY = 12;
    const { brand, stock, stockById } = patch;
    let cursor = 0;
    let count = 0;
    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= ids.length) break;
        const id = ids[index]!;
        const data: { brand?: string; stock?: number } = {};
        if (brand !== undefined) data.brand = brand;
        if (stockById && Object.prototype.hasOwnProperty.call(stockById, id)) {
          data.stock = stockById[id];
        } else if (stock !== undefined) {
          data.stock = stock;
        }
        if (Object.keys(data).length === 0) continue;
        await prisma.product.update({ where: { id }, data });
        count += 1;
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, ids.length) }, () => worker())
    );
    updatedCount = count;
  }

  if (updatedCount > 0) {
    revalidateStorefrontProducts();
    if (patch.recordVersion !== false) {
      const parts: string[] = [];
      if (patch.brand !== undefined) parts.push(`marca «${patch.brand}»`);
      if (patch.stock !== undefined || patch.stockById) parts.push("stock");
      const label =
        patch.versionLabel?.trim() ||
        `Actualización en lote (${updatedCount}): ${parts.join(" · ") || "campos"}`;
      await recordCatalogVersionSafe({
        label,
        summary: `Se actualizaron ${updatedCount} producto(s): ${parts.join(", ") || "campos"}.`,
        changes: [
          {
            entityType: CatalogEntities.PRODUCT,
            entityId: ids[0]!,
            action: CatalogActions.UPDATE,
            label: `Lote de ${updatedCount} producto(s)`,
            beforeData: { bulk: true },
            afterData: {
              bulk: true,
              updatedCount,
              brand: patch.brand ?? null,
              stock: patch.stock ?? null,
              stockByIdCount: patch.stockById ? Object.keys(patch.stockById).length : 0,
              sampleIds: ids.slice(0, 12),
            },
          },
        ],
      });
    }
  }

  return NextResponse.json({
    updated: updatedCount,
    requested: ids.length,
  });
}
