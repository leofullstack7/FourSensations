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
import { formatProductNameTitleCase } from "@/lib/product-display-name";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  recordVersion: z.boolean().optional().default(true),
  /** Total actualizado en el lote completo (para versionar en el último chunk). */
  reportUpdated: z.number().int().min(0).optional(),
});

/**
 * Normaliza nombres: primera letra de cada palabra en mayúscula.
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

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const ids = Array.from(new Set(parsed.data.ids));
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });

  const CONCURRENCY = 12;
  let cursor = 0;
  const tallies = Array.from({ length: Math.min(CONCURRENCY, Math.max(products.length, 1)) }, () => ({
    updated: 0,
    unchanged: 0,
  }));

  async function worker(slot: number) {
    const t = tallies[slot]!;
    while (true) {
      const index = cursor++;
      if (index >= products.length) break;
      const p = products[index]!;
      const nextName = formatProductNameTitleCase(p.name);
      if (!nextName || nextName === p.name) {
        t.unchanged += 1;
        continue;
      }
      await prisma.product.update({
        where: { id: p.id },
        data: { name: nextName },
      });
      t.updated += 1;
    }
  }

  await Promise.all(tallies.map((_, i) => worker(i)));
  const updated = tallies.reduce((s, t) => s + t.updated, 0);
  const unchanged = tallies.reduce((s, t) => s + t.unchanged, 0);

  if (updated > 0) {
    revalidateStorefrontProducts();
  }

  const versionCount = parsed.data.reportUpdated ?? updated;
  if (parsed.data.recordVersion !== false && versionCount > 0) {
    await recordCatalogVersionSafe({
      label: `Nombres normalizados (${versionCount})`,
      summary: `Se normalizó la capitalización de ${versionCount} nombre(s) de producto.`,
      changes: [
        {
          entityType: CatalogEntities.PRODUCT,
          entityId: products[0]?.id ?? ids[0]!,
          action: CatalogActions.UPDATE,
          label: `Lote de nombres (${versionCount})`,
          beforeData: { bulk: true, action: "normalize-names" },
          afterData: {
            bulk: true,
            updated: versionCount,
            unchanged,
            sampleIds: ids.slice(0, 12),
          },
        },
      ],
    });
  }

  return NextResponse.json({
    updated,
    unchanged,
    requested: ids.length,
    found: products.length,
  });
}
