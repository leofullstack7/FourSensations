/**
 * Uso (desde carpeta web):
 *   npm run migrate:proaging -- --dry   (solo vista previa)
 *   npm run migrate:proaging            (aplica migración)
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { runProagingMigration } from "../lib/server/proaging-rehome";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() },
  },
});

async function main() {
  const dryRun = process.argv.includes("--dry");
  const result = await runProagingMigration(prisma, { dryRun });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
