import type { PrismaClient } from "@prisma/client";

/** Normaliza para comparar subcategorías (Proaging → destino). */
export function normalizeProagingSubKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isProagingCategorySlug(category: string): boolean {
  const c = category.trim().toLowerCase().replace(/-/g, "");
  return c === "proaging";
}

export type RehomeTarget = { categorySlug: string; subcategoryName: string };

/**
 * Mapea la subcategoría antigua (Proaging) → categoría slug + nombre de subcategoría válidos en BD/menú.
 * Ajusta el mapa si tus nombres en admin difieren ligeramente.
 */
export function mapProagingSubToTarget(subRaw: string): RehomeTarget {
  const n = normalizeProagingSubKey(subRaw);

  const exact: Record<string, RehomeTarget> = {
    limpiadora: { categorySlug: "cuidado-piel", subcategoryName: "Limpiador" },
    limpiador: { categorySlug: "cuidado-piel", subcategoryName: "Limpiador" },
    "hidratante y nutricion": { categorySlug: "cuidado-piel", subcategoryName: "Hidratante" },
    "hidratante y nutrición": { categorySlug: "cuidado-piel", subcategoryName: "Hidratante" },
    hidratacion: { categorySlug: "cuidado-piel", subcategoryName: "Hidratante" },
    hidratación: { categorySlug: "cuidado-piel", subcategoryName: "Hidratante" },
  };
  if (exact[n]) return exact[n];

  // Cuidado piel — rutina / tratamiento / especiales (menu-config)
  if (/limpiad|desmaquill/.test(n)) return { categorySlug: "cuidado-piel", subcategoryName: "Limpiador" };
  if (/hidrat|nutric/.test(n)) return { categorySlug: "cuidado-piel", subcategoryName: "Hidratante" };
  if (/serum|sérum|vitamina|vit c|acido|ácido/.test(n)) return { categorySlug: "cuidado-piel", subcategoryName: "Sérum" };
  if (/tonico|tónico/.test(n)) return { categorySlug: "cuidado-piel", subcategoryName: "Tónico" };
  if (/mascarilla|mask/.test(n)) return { categorySlug: "cuidado-piel", subcategoryName: "Mascarillas" };
  if (/exfolia/.test(n)) return { categorySlug: "cuidado-piel", subcategoryName: "Exfoliante" };
  if (/contorno|ojos/.test(n)) return { categorySlug: "cuidado-piel", subcategoryName: "Contorno ojos" };
  if (/acne|acné|imperfeccion|imperfección|granos/.test(n)) return { categorySlug: "cuidado-piel", subcategoryName: "Acné" };
  if (/mancha|manchas|luminosidad|pigmento/.test(n)) return { categorySlug: "cuidado-piel", subcategoryName: "Manchas" };
  if (/anti|age|vejez|arrug|proaging|lifting|rejuvenec|firmeza|col[aá]geno|peptido/.test(n)) {
    return { categorySlug: "cuidado-piel", subcategoryName: "Antienvejecimiento" };
  }

  // Maquillaje
  if (/labial|gloss|brillo labial/.test(n)) return { categorySlug: "maquillaje", subcategoryName: "Labial" };
  if (/contorno labios|perfilador labio/.test(n)) return { categorySlug: "maquillaje", subcategoryName: "Contorno labios" };
  if (/sombra|delineador|pestañ|pestan|mascara de pestañ|cejas|parpado|párpado/.test(n)) {
    return { categorySlug: "maquillaje", subcategoryName: "Sombras" };
  }
  if (/base|corrector|rubor|bronzer|iluminador|contorno rostro/.test(n)) {
    return { categorySlug: "maquillaje", subcategoryName: "Base" };
  }

  // Cuidado capilar
  if (/shampoo|champ[uú]|acondicionador|capilar|cabello|rizo|tratamiento capilar|ampolla capilar/.test(n)) {
    return { categorySlug: "cuidado-capilar", subcategoryName: "Reparación" };
  }
  if (/finalizador|volumen|disciplina|aceite capilar|spray capilar/.test(n)) {
    return { categorySlug: "cuidado-capilar", subcategoryName: "Finalizadores" };
  }

  // Uñas
  if (/esmalte|uñas|unas|gel uv|semipermanente|manicura|fortalecedor uñas/.test(n)) {
    return { categorySlug: "unas", subcategoryName: "Esmaltes" };
  }

  // Hombres
  if (/hombre|barba|afeita|after shave|kit hombre/.test(n)) {
    return { categorySlug: "hombres", subcategoryName: "Limpiador facial" };
  }

  return { categorySlug: "cuidado-piel", subcategoryName: "Antienvejecimiento" };
}

export async function tagsFromSubcategoryMenu(
  prisma: PrismaClient,
  categorySlug: string,
  subcategoryName: string
): Promise<string[]> {
  const cat = await prisma.category.findFirst({ where: { slug: categorySlug } });
  if (!cat) return ["General"];
  const sub = await prisma.subcategory.findFirst({
    where: { categoryId: cat.id, name: subcategoryName },
  });
  if (!sub) return ["General"];
  const tag = (sub.menuTag?.trim() || "General").trim();
  return [tag];
}

export type ProagingMigrationResult = {
  productsUpdated: number;
  categoriesDeleted: number;
  dryRun: boolean;
  totalMatched: number;
  preview: { id: string; name: string; from: string; to: string }[];
};

/**
 * Reubica productos fuera de Proaging y opcionalmente elimina la fila Category.
 * No modifica imageUrl ni ProductImage: solo category, subcategory y tags.
 */
export async function runProagingMigration(
  prisma: PrismaClient,
  opts: { dryRun: boolean }
): Promise<ProagingMigrationResult> {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { category: { equals: "proaging", mode: "insensitive" } },
        { category: { equals: "pro-aging", mode: "insensitive" } },
      ],
    },
  });

  const preview: ProagingMigrationResult["preview"] = [];

  for (const p of products) {
    const target = mapProagingSubToTarget(p.subcategory);
    const tags = await tagsFromSubcategoryMenu(prisma, target.categorySlug, target.subcategoryName);
    preview.push({
      id: p.id,
      name: p.name,
      from: `${p.category} · ${p.subcategory}`,
      to: `${target.categorySlug} · ${target.subcategoryName}`,
    });
    if (opts.dryRun) continue;

    await prisma.product.update({
      where: { id: p.id },
      data: {
        category: target.categorySlug,
        subcategory: target.subcategoryName,
        tags,
      },
    });
  }

  let categoriesDeleted = 0;
  if (!opts.dryRun) {
    const doomed = await prisma.category.findMany({
      where: {
        OR: [
          { slug: { equals: "proaging", mode: "insensitive" } },
          { slug: { equals: "pro-aging", mode: "insensitive" } },
        ],
      },
    });
    for (const c of doomed) {
      await prisma.category.delete({ where: { id: c.id } });
      categoriesDeleted += 1;
    }
  }

  return {
    productsUpdated: opts.dryRun ? 0 : products.length,
    categoriesDeleted: opts.dryRun ? 0 : categoriesDeleted,
    dryRun: opts.dryRun,
    preview: preview.slice(0, 200),
    totalMatched: products.length,
  };
}
