import type { PrismaClient } from "@prisma/client";
import { normalizeTintCatalogName } from "@/lib/bulk-import/tint-catalog";

export type TintCatalogRow = { id: string; name: string };

/** Todas las familias/tipos de tinte registrados (orden alfabético). */
export async function fetchTintCatalogFromDb(prisma: PrismaClient): Promise<{
  families: TintCatalogRow[];
  types: TintCatalogRow[];
}> {
  const [families, types] = await Promise.all([
    prisma.tintFamily.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.tintType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { families, types };
}

/**
 * Crea familias/tipos faltantes (name en MAYÚSCULAS, upsert por nombre único).
 * Devuelve el catálogo completo actualizado.
 */
export async function upsertTintCatalogEntries(
  prisma: PrismaClient,
  params: { newFamilies?: string[]; newTypes?: string[] }
): Promise<{ families: TintCatalogRow[]; types: TintCatalogRow[] }> {
  const famNames = Array.from(
    new Set((params.newFamilies ?? []).map((n) => normalizeTintCatalogName(n)).filter(Boolean))
  );
  const typeNames = Array.from(
    new Set((params.newTypes ?? []).map((n) => normalizeTintCatalogName(n)).filter(Boolean))
  );

  for (const name of famNames) {
    await prisma.tintFamily.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
  for (const name of typeNames) {
    await prisma.tintType.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  return fetchTintCatalogFromDb(prisma);
}
