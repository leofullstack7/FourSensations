import type { PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/slugify";

/** Cualquier cliente Prisma o transacción con `$queryRaw` (no depende del delegate `productCombo`). */
type Queryable = Pick<PrismaClient, "$queryRaw">;

/** Genera un `slug` único para combos a partir del nombre. */
export async function allocateUniqueComboSlug(baseName: string, db: Queryable): Promise<string> {
  const base = slugify(baseName) || "combo";
  let candidate = base;
  for (let n = 0; n < 10_000; n++) {
    const hit = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "ProductCombo" WHERE slug = ${candidate} LIMIT 1
    `;
    if (!hit.length) return candidate;
    candidate = `${base}-${n + 1}`;
  }
  throw new Error("No se pudo generar slug único para el combo");
}
