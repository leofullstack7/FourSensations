import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const catalogJson = JSON.parse(
  readFileSync(path.join(__dirname, "../lib/catalog-product-copy.json"), "utf8"),
);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const catalogKeys = new Set();
for (const [name, entry] of Object.entries(catalogJson)) {
  catalogKeys.add(normalize(name));
  for (const alias of entry.aliases ?? []) catalogKeys.add(normalize(alias));
}
for (const extra of ["bomba capilar", "kit scalp therapy", "scalp therapy", "luna llena"]) {
  catalogKeys.add(extra);
}

function inCatalog(name) {
  const key = normalize(name);
  if (catalogKeys.has(key)) return true;
  for (const k of catalogKeys) {
    if (key.includes(k) || k.includes(key)) return true;
  }
  return false;
}

const prisma = new PrismaClient();

async function main() {
  const dry = process.argv.includes("--dry");
  const products = await prisma.product.findMany({
    select: { id: true, name: true, brand: true, active: true, price: true },
  });

  const toDisable = products.filter((p) => p.active && !inCatalog(p.name));
  console.log(
    JSON.stringify(
      {
        dry,
        keep: products.filter((p) => inCatalog(p.name)).map((p) => p.name),
        disable: toDisable.map((p) => `${p.name} (${p.brand}) $${p.price}`),
      },
      null,
      2,
    ),
  );

  if (!dry) {
    for (const p of toDisable) {
      await prisma.product.update({ where: { id: p.id }, data: { active: false } });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
