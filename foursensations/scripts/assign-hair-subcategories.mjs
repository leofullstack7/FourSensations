import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();
const skuTable = JSON.parse(readFileSync(resolve(process.cwd(), "lib/product-skus.json"), "utf8"));

const HAIR_GROUPS = {
  Tratamientos: ["Dulce Renacer", "Sensación Primaveral", "Proteína Capilar"],
  "Shampoo y Acondicionador": ["Botanical", "Kit Tentación Equilibrio", "Kit Tentación Nutrición", "Kit Scalp Therapy"],
  "Crecimiento y Fortalecimiento": ["Secreto de Primavera", "Shots Capilares"],
  "Detox y Cuero Cabelludo": ["Scrub Glow", "Kit Scalp Therapy", "Cepillo"],
  "Finalizadores y Protección": ["Fantasía Natural", "Shine Gloss"],
  "Hair Mist": ["Sweet Love", "BloomShine", "Scarlette", "Golden Glow"],
  "Reparación de Puntas": ["Luna Llena", "Suspiros"],
  "Pre - Shampoo": ["Bomba Capilar"],
};

const NAME_TO_SUB = {
  "proteina 10 en 1": "Tratamientos",
  "proteina capilar": "Tratamientos",
  "dulce renacer": "Tratamientos",
  "sensacion primaveral": "Tratamientos",
  botanical: "Shampoo y Acondicionador",
  "scalp therapy": "Shampoo y Acondicionador",
  "kit scalp therapy": "Shampoo y Acondicionador",
  "tentacion nutricion": "Shampoo y Acondicionador",
  "kit tentacion nutricion": "Shampoo y Acondicionador",
  "tentacion equilibrio": "Shampoo y Acondicionador",
  "kit tentacion equilibrio": "Shampoo y Acondicionador",
  "secreto de primavera": "Crecimiento y Fortalecimiento",
  shots: "Crecimiento y Fortalecimiento",
  "shots capilares": "Crecimiento y Fortalecimiento",
  "shots x3": "Crecimiento y Fortalecimiento",
  "scrub glow": "Detox y Cuero Cabelludo",
  "cepillo masajeador capilar": "Detox y Cuero Cabelludo",
  "shine gloss": "Finalizadores y Protección",
  "2. shine gloss": "Finalizadores y Protección",
  "fantasia natural": "Finalizadores y Protección",
  "1. fantasia natural": "Finalizadores y Protección",
  "bloom shine": "Hair Mist",
  bloomshine: "Hair Mist",
  "sweet love": "Hair Mist",
  scarlette: "Hair Mist",
  "golden glow": "Hair Mist",
  "brumas capilares": "Hair Mist",
  suspiros: "Reparación de Puntas",
  "luna llena": "Reparación de Puntas",
  "bomba capilar": "Pre - Shampoo",
};

function normalizeName(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hairSub(name) {
  return NAME_TO_SUB[normalizeName(name)] ?? null;
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: "cuidado-capilar" },
    update: { name: "Cuidado capilar" },
    create: { slug: "cuidado-capilar", name: "Cuidado capilar", icon: "💇", sortOrder: 0 },
  });

  await prisma.category.upsert({
    where: { slug: "cuidado-corporal" },
    update: { name: "Cuidado Corporal" },
    create: { slug: "cuidado-corporal", name: "Cuidado Corporal", icon: "🧴", sortOrder: 1 },
  });

  let sortOrder = 0;
  for (const [group, lines] of Object.entries(HAIR_GROUPS)) {
    for (const line of lines) {
      const slug = slugify(`${group}-${line}`);
      await prisma.subcategory.upsert({
        where: { categoryId_slug: { categoryId: category.id, slug } },
        update: { name: line, menuTag: group, sortOrder },
        create: { categoryId: category.id, slug, name: line, menuTag: group, sortOrder },
      });
      sortOrder += 1;
    }
  }

  const products = await prisma.product.findMany({
    select: { id: true, name: true, externalRef: true, subcategory: true },
  });
  const skuByCode = new Map(skuTable.map((row) => [row.sku, row]));

  let updated = 0;
  for (const product of products) {
    const skuRow = product.externalRef ? skuByCode.get(product.externalRef) : null;
    const names = [product.name, skuRow?.name, ...(skuRow?.aliases ?? [])].filter(Boolean);
    let sub = null;
    for (const name of names) {
      sub = hairSub(name);
      if (sub) break;
    }
    if (!sub || product.subcategory === sub) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: { category: "cuidado-capilar", subcategory: sub },
    });
    updated += 1;
    console.log(`${product.externalRef || product.id.slice(0, 6)} ${product.name} → ${sub}`);
  }

  console.log(`Subcategorías capilares listas. Productos actualizados: ${updated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
