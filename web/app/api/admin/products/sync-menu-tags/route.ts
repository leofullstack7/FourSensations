import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";

/**
 * Asigna `Product.tags = [menuTag]` según la subcategoría en Prisma (slug categoría + nombre sub).
 * Idempotente: solo actualiza filas donde los tags difieren del esperado.
 */
export async function POST() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        select: { id: true, category: true, subcategory: true, tags: true },
      }),
      prisma.category.findMany({
        include: { subcategories: true },
      }),
    ]);

    let updated = 0;
    for (const p of products) {
      const cat = categories.find((c) => c.slug === p.category);
      if (!cat) continue;
      const sub = cat.subcategories.find((s) => s.name === p.subcategory);
      if (!sub) continue;
      const tag = (sub.menuTag?.trim() || "General").trim();
      const nextTags = [tag];
      const cur = p.tags ?? [];
      const same =
        cur.length === nextTags.length && cur.every((t, i) => t === nextTags[i]);
      if (same) continue;
      await prisma.product.update({
        where: { id: p.id },
        data: { tags: nextTags },
      });
      updated += 1;
    }

    return NextResponse.json({ updated, total: products.length });
  } catch (e) {
    console.error("[POST /api/admin/products/sync-menu-tags]", e);
    return NextResponse.json({ error: "Error al sincronizar etiquetas" }, { status: 500 });
  }
}
