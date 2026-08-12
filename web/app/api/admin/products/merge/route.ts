import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { prismaProductToAdmin } from "@/lib/mappers/admin-product";
import { normalizeProductNameForDb } from "@/lib/bulk-import/semantic-map";
import {
  CatalogActions,
  CatalogEntities,
  loadProductSnapshot,
  snapshotProduct,
  type CatalogChangeInput,
} from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";
import { revalidateStorefrontProducts } from "@/lib/server/revalidate-storefront-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mergeSchema = z.object({
  survivorId: z.string().min(1),
  absorbedIds: z.array(z.string().min(1)).min(1),
  name: z.string().min(1).max(200),
});

/**
 * Une varios productos en uno: conserva el sobreviviente, fusiona imágenes y elimina el resto.
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

  const parsed = mergeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { survivorId, name: rawName } = parsed.data;
  const absorbedIds = Array.from(new Set(parsed.data.absorbedIds.filter((id) => id !== survivorId)));
  if (absorbedIds.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos 2 productos distintos para unir" }, { status: 400 });
  }

  const allIds = [survivorId, ...absorbedIds];
  const rows = await prisma.product.findMany({
    where: { id: { in: allIds } },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (rows.length !== allIds.length) {
    return NextResponse.json({ error: "Uno o más productos no existen" }, { status: 404 });
  }

  const survivor = rows.find((r) => r.id === survivorId);
  if (!survivor) {
    return NextResponse.json({ error: "Producto destino no encontrado" }, { status: 404 });
  }
  const absorbed = rows.filter((r) => r.id !== survivorId);
  const name = normalizeProductNameForDb(rawName.trim()) || survivor.name;

  const urlOrder: string[] = [];
  const pushUrl = (url: string | null | undefined) => {
    const u = url?.trim();
    if (!u) return;
    if (urlOrder.includes(u)) return;
    urlOrder.push(u);
  };
  pushUrl(survivor.imageUrl);
  for (const img of survivor.images) pushUrl(img.url);
  for (const p of absorbed) {
    pushUrl(p.imageUrl);
    for (const img of p.images) pushUrl(img.url);
  }

  const mainUrl = urlOrder[0] ?? null;
  const galleryUrls = urlOrder.slice(1);

  const beforeSnap = await loadProductSnapshot(survivorId);
  const absorbedSnaps = await Promise.all(absorbed.map((p) => loadProductSnapshot(p.id)));

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Reasignar ítems de combo: fusionar cantidades si el sobreviviente ya está en el mismo combo.
      const comboItems = await tx.productComboItem.findMany({
        where: { productId: { in: absorbedIds } },
      });
      for (const item of comboItems) {
        const existing = await tx.productComboItem.findFirst({
          where: { comboId: item.comboId, productId: survivorId },
        });
        if (existing) {
          await tx.productComboItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + item.quantity },
          });
          await tx.productComboItem.delete({ where: { id: item.id } });
        } else {
          await tx.productComboItem.update({
            where: { id: item.id },
            data: { productId: survivorId },
          });
        }
      }

      await tx.sale.updateMany({
        where: { productId: { in: absorbedIds } },
        data: { productId: survivorId },
      });
      await tx.orderItem.updateMany({
        where: { productId: { in: absorbedIds } },
        data: { productId: survivorId },
      });

      // Featured en categorías: reemplazar ids absorbidos por el sobreviviente.
      const categories = await tx.category.findMany({
        select: { id: true, storefrontFeaturedProductIds: true },
      });
      const absorbSet = new Set(absorbedIds);
      for (const cat of categories) {
        const ids = cat.storefrontFeaturedProductIds ?? [];
        if (!ids.some((id) => absorbSet.has(id))) continue;
        const next: string[] = [];
        for (const id of ids) {
          if (absorbSet.has(id)) {
            if (!next.includes(survivorId)) next.push(survivorId);
            continue;
          }
          if (!next.includes(id)) next.push(id);
        }
        await tx.category.update({
          where: { id: cat.id },
          data: { storefrontFeaturedProductIds: next },
        });
      }

      // Borrar absorbidos (cascada en images / combo residual).
      await tx.product.deleteMany({ where: { id: { in: absorbedIds } } });

      // Reconstruir galería del sobreviviente.
      await tx.productImage.deleteMany({ where: { productId: survivorId } });
      if (galleryUrls.length > 0) {
        await tx.productImage.createMany({
          data: galleryUrls.map((url, i) => ({
            productId: survivorId,
            url,
            sortOrder: i,
          })),
        });
      }

      return tx.product.update({
        where: { id: survivorId },
        data: {
          name,
          imageUrl: mainUrl,
        },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });
    });

    const groupCode = updated.variantGroupCode;
    if (groupCode) {
      const leftInGroup = await prisma.product.count({
        where: { variantGroupCode: groupCode },
      });
      if (leftInGroup < 2) {
        await prisma.product.update({
          where: { id: survivorId },
          data: { variantGroupCode: null, variantGroupOrder: null },
        });
        updated.variantGroupCode = null;
        updated.variantGroupOrder = null;
      }
    }

    const changes: CatalogChangeInput[] = [
      {
        entityType: CatalogEntities.PRODUCT,
        entityId: survivorId,
        action: CatalogActions.UPDATE,
        label: `Producto unificado: ${name}`,
        beforeData: beforeSnap,
        afterData: snapshotProduct(updated),
      },
      ...absorbed.map((p, i) => ({
        entityType: CatalogEntities.PRODUCT,
        entityId: p.id,
        action: CatalogActions.DELETE,
        label: `Producto fusionado en «${name}»: ${p.name}`,
        beforeData: absorbedSnaps[i] ?? null,
        afterData: null,
      })),
    ];
    await recordCatalogVersionSafe({
      label: `Unión de productos: ${absorbed.length + 1} → 1`,
      summary: `Se unieron ${absorbed.length + 1} productos en «${name}» (${urlOrder.length} imagen(es)).`,
      changes,
    });

    revalidateStorefrontProducts();

    return NextResponse.json({
      ok: true,
      mergedCount: absorbed.length + 1,
      imageCount: urlOrder.length,
      product: prismaProductToAdmin(updated),
    });
  } catch (e) {
    console.error("[POST /api/admin/products/merge]", e);
    return NextResponse.json({ error: "Error al unir productos" }, { status: 500 });
  }
}
