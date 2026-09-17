import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const skuTable = JSON.parse(readFileSync(resolve(process.cwd(), "lib/product-skus.json"), "utf8"));
const prisma = new PrismaClient();

function namesFor(entry) {
  return [entry.name, ...(entry.aliases ?? [])].filter(Boolean);
}

async function main() {
  let updated = 0;
  for (const entry of skuTable) {
    const names = namesFor(entry);
    const result = await prisma.product.updateMany({
      where: { OR: names.map((name) => ({ name: { equals: name, mode: "insensitive" } })) },
      data: { externalRef: entry.sku },
    });
    updated += result.count;
    console.log(`${entry.sku} ${entry.name}: ${result.count} fila(s)`);
  }
  console.log(`Total filas actualizadas: ${updated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
