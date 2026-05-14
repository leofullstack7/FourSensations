import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

/** Genera un `slug` único para combos a partir del nombre. */
export async function allocateUniqueComboSlug(baseName: string): Promise<string> {
  const base = slugify(baseName) || "combo";
  let candidate = base;
  for (let n = 0; n < 10_000; n++) {
    const row = await prisma.productCombo.findUnique({ where: { slug: candidate } });
    if (!row) return candidate;
    candidate = `${base}-${n + 1}`;
  }
  throw new Error("No se pudo generar slug único para el combo");
}
