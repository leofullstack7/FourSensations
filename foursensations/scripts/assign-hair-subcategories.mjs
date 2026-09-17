import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();
const skuTable = JSON.parse(readFileSync(resolve(process.cwd(), "lib/product-skus.json"), "utf8"));

const HAIR_GROUPS = {
  Tratamientos: ["Proteína 10 en 1", "Dulce Renacer", "Sensación Primaveral", "Shots"],
  Rutinas: ["Botanical", "Scalp Therapy", "Tentación Nutrición", "Tentación Equilibrio"],
  Finalizadores: ["Shine Gloss", "Fantasía Natural"],
  Tónicos: ["Secreto de Primavera"],
  Fragancias: ["Bloom Shine", "Sweet Love", "Scarlette", "Golden Glow"],
  Multiuso: ["Suspiros", "Luna Llena"],
};

const NAME_TO_SUB = {
  "proteina 10 en 1": "Tratamientos",
  "proteina capilar": "Tratamientos",
  "dulce renacer": "Tratamientos",
  "sensacion primaveral": "Tratamientos",
  shots: "Tratamientos",
  "shots capilares": "Tratamientos",
  "shots x3": "Tratamientos",
  "scrub glow": "Tratamientos",
  botanical: "Rutinas",
  "scalp therapy": "Rutinas",
  "tentacion nutricion": "Rutinas",
  "tentacion equilibrio": "Rutinas",
  "shine gloss": "Finalizadores",
  "2. shine gloss": "Finalizadores",
  "fantasia natural": "Finalizadores",
  "1. fantasia natural": "Finalizadores",
  "secreto de primavera": "Tónicos",
  "bloom shine": "Fragancias",
  "sweet love": "Fragancias",
  scarlette: "Fragancias",
  "golden glow": "Fragancias",
  "brumas capilares": "Fragancias",
  suspiros: "Multiuso",
  "luna llena": "Multiuso",
  "crema autobronceadora": "Multiuso",
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
