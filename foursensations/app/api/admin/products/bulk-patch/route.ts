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
import { applyProductBrandToIds } from "@/lib/server/apply-product-brand";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const bulkPatchSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(500),
    brand: z.string().trim().min(1).max(120).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    /** false = no sale en la tienda. */
    active: z.boolean().optional(),
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
      v.active !== undefined ||
      (v.stockById && Object.keys(v.stockById).length > 0),
    { message: "Indica brand, stock, active o stockById" }
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
  let brandApplied: string | null = null;

  // Cambio de familia: mueve también variantes hermanas y sincroniza familia de tinte.
  if (patch.brand !== undefined) {
    const result = await applyProductBrandToIds(ids, patch.brand);
    updatedCount = result.updatedIds.length;
    brandApplied = result.brand;

    // Si además hay stock/active, aplicar sobre el conjunto expandido.
    if (patch.active !== undefined || patch.stock !== undefined || patch.stockById) {
      const targetIds = result.updatedIds.length > 0 ? result.updatedIds : ids;
      if (patch.active !== undefined && !patch.stockById && patch.stock === undefined) {
        await prisma.product.updateMany({
          where: { id: { in: targetIds } },
          data: { active: patch.active },
        });
      } else if (patch.stock !== undefined && !patch.stockById && patch.active === undefined) {
        await prisma.product.updateMany({
          where: { id: { in: targetIds } },
          data: { stock: patch.stock },
        });
      } else if (patch.stockById && patch.active === undefined && patch.stock === undefined) {
        const byStock = new Map<number, string[]>();
        for (const id of targetIds) {
          if (!Object.prototype.hasOwnProperty.call(patch.stockById, id)) continue;
          const stock = patch.stockById[id]!;
          const list = byStock.get(stock) ?? [];
          list.push(id);
          byStock.set(stock, list);
        }
        for (const [stock, groupIds] of byStock) {
          await prisma.product.updateMany({
            where: { id: { in: groupIds } },
            data: { stock },
          });
        }
      } else {
        const CONCURRENCY = 12;
        const { stock, stockById, active } = patch;
        let cursor = 0;
        async function worker() {
          while (true) {
            const index = cursor++;
            if (index >= targetIds.length) break;
            const id = targetIds[index]!;
            const data: { stock?: number; active?: boolean } = {};
            if (active !== undefined) data.active = active;
            if (stockById && Object.prototype.hasOwnProperty.call(stockById, id)) {
              data.stock = stockById[id];
            } else if (stock !== undefined) {
              data.stock = stock;
            }
            if (Object.keys(data).length === 0) continue;
            await prisma.product.update({ where: { id }, data });
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, targetIds.length) }, () => worker())
        );
      }
    }
  } else if (
    patch.active !== undefined &&
    !patch.stockById &&
    patch.stock === undefined
  ) {
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { active: patch.active },
    });
    updatedCount = result.count;
    revalidateStorefrontProducts();
  } else if (patch.stock !== undefined && patch.active === undefined && !patch.stockById) {
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { stock: patch.stock },
    });
    updatedCount = result.count;
    revalidateStorefrontProducts();
  } else if (patch.stockById && patch.active === undefined) {
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
    if (updatedCount > 0) revalidateStorefrontProducts();
  } else {
    const CONCURRENCY = 12;
    const { stock, stockById, active } = patch;
    let cursor = 0;
    let count = 0;
    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= ids.length) break;
        const id = ids[index]!;
        const data: { stock?: number; active?: boolean } = {};
        if (active !== undefined) data.active = active;
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
    if (updatedCount > 0) revalidateStorefrontProducts();
  }

  if (updatedCount > 0 && patch.recordVersion !== false) {
    const parts: string[] = [];
    if (brandApplied) parts.push(`marca «${brandApplied}»`);
    if (patch.active === false) parts.push("ocultos en tienda");
    if (patch.active === true) parts.push("visibles en tienda");
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
            brand: brandApplied,
            active: patch.active ?? null,
            stock: patch.stock ?? null,
            stockByIdCount: patch.stockById ? Object.keys(patch.stockById).length : 0,
            sampleIds: ids.slice(0, 12),
          },
        },
      ],
    });
  }

  return NextResponse.json({
    updated: updatedCount,
    requested: ids.length,
  });
}
