import { prisma } from "@/lib/prisma";

export function normalizeProductFamilyName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export async function findProductFamilyByName(name: string): Promise<{ id: string; name: string } | null> {
  const normalized = normalizeProductFamilyName(name);
  if (!normalized) return null;
  return prisma.productFamily.findFirst({
    where: { name: { equals: normalized, mode: "insensitive" } },
    select: { id: true, name: true },
  });
}

/** Crea la familia si no existe (comparación sin distinguir mayúsculas). */
export async function upsertProductFamilyByName(name: string): Promise<{ id: string; name: string }> {
  const normalized = normalizeProductFamilyName(name);
  if (!normalized) {
    throw new Error("El nombre de la familia no puede estar vacío");
  }
  const existing = await findProductFamilyByName(normalized);
  if (existing) return existing;
  return prisma.productFamily.create({
    data: { name: normalized },
    select: { id: true, name: true },
  });
}

/** Incorpora al catálogo las marcas que ya están en productos. */
export async function syncProductFamiliesFromBrands(): Promise<number> {
  const rows = await prisma.product.findMany({
    where: { NOT: { brand: "" } },
    select: { brand: true },
    distinct: ["brand"],
  });
  const existing = await prisma.productFamily.findMany({ select: { name: true } });
  const seen = new Set(existing.map((f) => f.name.trim().toLowerCase()));
  const toCreate: { name: string }[] = [];
  for (const row of rows) {
    const name = normalizeProductFamilyName(row.brand);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    toCreate.push({ name });
  }
  if (toCreate.length === 0) return 0;
  const result = await prisma.productFamily.createMany({ data: toCreate, skipDuplicates: true });
  return result.count;
}
