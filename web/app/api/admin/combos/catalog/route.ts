import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreJson = (body: unknown, init?: ResponseInit) =>
  NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  subcategory: string;
  tags: string[];
  price: number;
  imageUrl: string | null;
  emoji: string | null;
  description: string;
  stock: number;
  soldQty: number;
};

function mergeSoldQty(
  orderRows: { productId: string | null; _sum: { quantity: number | null } }[],
  saleRows: { productId: string | null; _sum: { qty: number | null } }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of orderRows) {
    if (!r.productId) continue;
    map.set(r.productId, (map.get(r.productId) ?? 0) + (r._sum.quantity ?? 0));
  }
  for (const r of saleRows) {
    if (!r.productId) continue;
    map.set(r.productId, (map.get(r.productId) ?? 0) + (r._sum.qty ?? 0));
  }
  return map;
}

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();
  const subcategory = (searchParams.get("subcategory") ?? "").trim();
  const tag = (searchParams.get("tag") ?? "").trim();
  const brand = (searchParams.get("brand") ?? "").trim();

  try {
    const [orderAgg, saleAgg, filterRows] = await Promise.all([
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { productId: { not: null } },
        _sum: { quantity: true },
      }),
      prisma.sale.groupBy({
        by: ["productId"],
        where: { productId: { not: null } },
        _sum: { qty: true },
      }),
      prisma.product.findMany({
        where: { active: true },
        select: {
          brand: true,
          category: true,
          subcategory: true,
          tags: true,
        },
        take: 8000,
      }),
    ]);

    const soldMap = mergeSoldQty(orderAgg, saleAgg);

    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(q
        ? {
            name: { contains: q, mode: "insensitive" as const },
          }
        : {}),
      ...(category ? { category } : {}),
      ...(subcategory ? { subcategory } : {}),
      ...(brand ? { brand } : {}),
      ...(tag
        ? {
            tags: { has: tag },
          }
        : {}),
    };

    const rows = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        brand: true,
        category: true,
        subcategory: true,
        tags: true,
        price: true,
        imageUrl: true,
        emoji: true,
        description: true,
        stock: true,
      },
      take: 600,
    });

    const brands = new Set<string>();
    const categories = new Set<string>();
    const subcategories = new Set<string>();
    const tags = new Set<string>();
    for (const r of filterRows) {
      if (r.brand?.trim()) brands.add(r.brand.trim());
      if (r.category?.trim()) categories.add(r.category.trim());
      if (r.subcategory?.trim()) subcategories.add(r.subcategory.trim());
      for (const t of r.tags ?? []) {
        const v = t.trim();
        if (v) tags.add(v);
      }
    }

    const products: CatalogProduct[] = rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      category: p.category,
      subcategory: p.subcategory,
      tags: p.tags ?? [],
      price: p.price,
      imageUrl: p.imageUrl,
      emoji: p.emoji,
      description: p.description,
      stock: p.stock,
      soldQty: soldMap.get(p.id) ?? 0,
    }));

    products.sort((a, b) => {
      if (a.soldQty !== b.soldQty) return a.soldQty - b.soldQty;
      return Math.random() - 0.5;
    });

    return noStoreJson({
      products,
      filterOptions: {
        brands: [...brands].sort((a, b) => a.localeCompare(b, "es")),
        categories: [...categories].sort((a, b) => a.localeCompare(b, "es")),
        subcategories: [...subcategories].sort((a, b) => a.localeCompare(b, "es")),
        tags: [...tags].sort((a, b) => a.localeCompare(b, "es")),
      },
    });
  } catch (e) {
    console.error("[GET /api/admin/combos/catalog]", e);
    return noStoreJson({ error: "Error al cargar catálogo para combos" }, { status: 500 });
  }
}
