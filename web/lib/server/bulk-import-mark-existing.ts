import type { PrismaClient } from "@prisma/client";
import type { BulkPreviewResult } from "@/lib/bulk-import/build-preview";

/**
 * Marca **todas** las filas del preview cuyo `normalizedCode` coincide con `Product.externalRef`.
 * Debe ejecutarse sobre `preview.rows` (no solo `matchedRows`): las filas sin imagen en el ZIP
 * siguen siendo el mismo objeto que en `rows` y deben mostrar «Producto ya registrado».
 */
export async function markBulkPreviewExistingByExternalRef(
  prisma: Pick<PrismaClient, "product">,
  preview: BulkPreviewResult
): Promise<void> {
  const codes = new Set<string>();
  for (const r of preview.rows) {
    if (r.normalizedCode) codes.add(r.normalizedCode);
  }
  if (codes.size === 0) {
    preview.stats.existingProductRows = 0;
    return;
  }

  const codeList = Array.from(codes);
  const existing = await prisma.product.findMany({
    where: { externalRef: { in: codeList } },
    select: { id: true, name: true, externalRef: true },
  });

  const byRef = new Map<string, { id: string; name: string }>();
  for (const p of existing) {
    if (p.externalRef == null || p.externalRef === "") continue;
    byRef.set(p.externalRef, { id: p.id, name: p.name });
  }

  let marked = 0;
  for (const row of preview.rows) {
    const ref = row.normalizedCode;
    if (!ref) continue;
    const hit = byRef.get(ref);
    if (!hit) continue;
    row.isExistingProduct = true;
    row.existingProductId = hit.id;
    row.existingProductName = hit.name;
    if (!row.issues.includes("Producto ya registrado")) {
      row.issues.push("Producto ya registrado");
    }
    row.selected = false;
    marked += 1;
  }

  preview.stats.existingProductRows = marked;
}
