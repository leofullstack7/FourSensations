import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DISCOUNT_PERCENT_MAX, DISCOUNT_PERCENT_MIN } from "@/lib/product-discount";
import {
  applyProductDiscounts,
  expireDueProductDiscounts,
  removeProductDiscounts,
  revalidateStorefrontAfterDiscounts,
} from "@/lib/server/product-discounts";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  CatalogActions,
  CatalogEntities,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("apply"),
    ids: z.array(z.string().min(1)).min(1).max(500),
    percent: z.coerce.number().int().min(DISCOUNT_PERCENT_MIN).max(DISCOUNT_PERCENT_MAX),
    endsAt: z.string().min(1).nullable().optional(),
  }),
  z.object({
    action: z.literal("remove"),
    ids: z.array(z.string().min(1)).min(1).max(500),
  }),
]);

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const expired = await expireDueProductDiscounts(prisma);
    if (expired.length > 0) {
      revalidateStorefrontAfterDiscounts(expired.map((p) => p.category));
    }
    return NextResponse.json({ expired: expired.length });
  } catch (e) {
    console.error("[GET /api/admin/products/discounts]", e);
    return NextResponse.json({ expired: 0 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  try {
    await expireDueProductDiscounts(prisma);

    const ids = Array.from(new Set(parsed.data.ids));
    const rows = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        price: true,
        originalPrice: true,
        discountPercent: true,
        discountEndsAt: true,
        discountBasePrice: true,
        category: true,
      },
    });
    if (rows.length === 0) {
      return NextResponse.json({ error: "No se encontraron productos" }, { status: 404 });
    }

    let updated = 0;
    let label = "";
    if (parsed.data.action === "apply") {
      const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
      if (endsAt && Number.isNaN(endsAt.getTime())) {
        return NextResponse.json({ error: "Fecha de fin inválida" }, { status: 400 });
      }
      if (endsAt && endsAt.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: "La fecha de fin debe ser posterior a ahora" },
          { status: 400 },
        );
      }
      updated = await applyProductDiscounts(prisma, rows, parsed.data.percent, endsAt);
      label = endsAt
        ? `Descuento ${parsed.data.percent}% hasta ${endsAt.toISOString().slice(0, 10)}`
        : `Descuento ${parsed.data.percent}% hasta quitarlo`;
    } else {
      updated = await removeProductDiscounts(prisma, rows);
      label = "Quitar descuento";
    }

    revalidateStorefrontAfterDiscounts(rows.map((r) => r.category));

    if (updated > 0) {
      await recordCatalogVersionSafe({
        label: `${label} · ${updated} producto(s)`,
        summary: `${label} en ${updated} producto(s): ${rows
          .slice(0, 8)
          .map((r) => r.name)
          .join(", ")}${rows.length > 8 ? "…" : ""}.`,
        changes: [
          {
            entityType: CatalogEntities.PRODUCT,
            entityId: rows[0]!.id,
            action: CatalogActions.UPDATE,
            label: `${label} · lote de ${updated}`,
            beforeData: { bulk: true },
            afterData: {
              bulk: true,
              updatedCount: updated,
              action: parsed.data.action,
              sampleIds: ids.slice(0, 12),
            },
          },
        ],
      });
    }

    return NextResponse.json({ updated });
  } catch (e) {
    console.error("[POST /api/admin/products/discounts]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo actualizar el descuento" },
      { status: 500 },
    );
  }
}
