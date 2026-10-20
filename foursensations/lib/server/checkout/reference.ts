import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Referencia corta tipo FS940121 (FS + 6 dígitos).
 * Reintenta ante colisión con la BD.
 */
export async function generateOrderReference(): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const n = randomInt(100_000, 1_000_000);
    const reference = `FS${n}`;
    const exists = await prisma.order.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (!exists) return reference;
  }
  // Fallback ultra-raro: FS + timestamp compacto
  const fallback = `FS${String(Date.now()).slice(-6)}`;
  return fallback;
}
