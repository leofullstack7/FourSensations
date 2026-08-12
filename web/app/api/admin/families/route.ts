import { NextRequest } from "next/request";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import {
  normalizeProductFamilyName,
  syncProductFamiliesFromBrands,
  upsertProductFamilyByName,
} from "@/lib/server/product-family";
import type { AdminProductFamily } from "@/lib/types/admin-family";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const createSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre de la familia").max(120),
});

async function familiesWithCounts(): Promise<AdminProductFamily[]> {
  const [families, grouped] = await Promise.all([
    prisma.productFamily.findMany({ orderBy: { name: "asc" } }),
    prisma.product.groupBy({ by: ["brand"], _count: { _all: true } }),
  ]);
  const countByLower = new Map<string, number>();
  for (const g of grouped) {
    const key = g.brand.trim().toLowerCase();
    if (!key) continue;
    countByLower.set(key, (countByLower.get(key) ?? 0) + g._count._all);
  }
  return families.map((f) => ({
    id: f.id,
    name: f.name,
    productCount: countByLower.get(f.name.trim().toLowerCase()) ?? 0,
    createdAt: f.createdAt.toISOString(),
  }));
}

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    await syncProductFamiliesFromBrands();
    return noStoreJson({ families: await familiesWithCounts() });
  } catch (e) {
    console.error("[GET /api/admin/families]", e);
    return noStoreJson({ error: "Error al listar familias" }, { status: 500 });
  }
}

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
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return noStoreJson(
        { error: parsed.error.issues[0]?.message ?? "Nombre inválido" },
        { status: 400 }
      );
    }
    const name = normalizeProductFamilyName(parsed.data.name);
    const family = await upsertProductFamilyByName(name);
    const [withCount] = (await familiesWithCounts()).filter((f) => f.id === family.id);
    return noStoreJson({ family: withCount ?? { ...family, productCount: 0, createdAt: new Date().toISOString() } }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/admin/families]", e);
    return noStoreJson({ error: "No se pudo crear la familia" }, { status: 500 });
  }
}
