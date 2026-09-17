/**
 * Uso (desde carpeta web):
 *   npm run migrate:cuidado-facial -- --dry   (solo vista previa)
 *   npm run migrate:cuidado-facial            (aplica migración)
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { runCuidadoFacialMigration } from "../lib/server/cuidado-facial-rehome";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() },
  },
});

async function main() {
  const dryRun = process.argv.includes("--dry");
  const result = await runCuidadoFacialMigration(prisma, { dryRun });
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
