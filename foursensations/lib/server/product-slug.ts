import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

/** Genera un `slug` único a partir del nombre (opcionalmente excluye un producto al editar). */
export async function allocateUniqueProductSlug(
  baseName: string,
  excludeProductId?: string
): Promise<string> {
  const base = slugify(baseName) || "producto";
  let candidate = base;
  for (let n = 0; n < 10_000; n++) {
    const row = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!row || row.id === excludeProductId) return candidate;
    candidate = `${base}-${n + 1}`;
  }
  throw new Error("No se pudo generar slug único");
}
