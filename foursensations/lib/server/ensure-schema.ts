import { prisma } from "@/lib/prisma";

let ensured: Promise<void> | null = null;

async function addColumnIfMissing(table: string, column: string, ddl: string) {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${ddl}`,
    );
  } catch (e) {
    console.warn(`[ensure-schema] ${table}.${column}`, e);
  }
}

/** Columnas nuevas usadas por kits / CRM cupón (Render no hace db push automático). */
export async function ensureStoreSchemaExtras(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (!ensured) {
    ensured = (async () => {
      await addColumnIfMissing("User", "phone", "TEXT");
      await addColumnIfMissing("ProductCombo", "imageUrl", "TEXT");
      await addColumnIfMissing("ProductCombo", "storeProductId", "TEXT");
      await addColumnIfMissing("ProductComboItem", "unitPrice", "INTEGER");
      await addColumnIfMissing("Order", "fulfillmentStage", "INTEGER NOT NULL DEFAULT 1");
      await addColumnIfMissing("Order", "fulfillmentStageAt", "TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP");
      await addColumnIfMissing("Coupon", "kind", "TEXT NOT NULL DEFAULT 'CLASSIC'");
      await addColumnIfMissing("Coupon", "assignedEmail", "TEXT");
      await addColumnIfMissing("Coupon", "assignedAt", "TIMESTAMP(3)");
      await addColumnIfMissing("Order", "storeEmailSentAt", "TIMESTAMP(3)");
      await addColumnIfMissing("Order", "customerEmailSentAt", "TIMESTAMP(3)");
      try {
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Coupon_kind_idx" ON "Coupon"("kind")`);
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "Coupon_assignedEmail_idx" ON "Coupon"("assignedEmail")`,
        );
      } catch {
        /* ignore */
      }
      try {
        await prisma.$executeRawUnsafe(
          `CREATE UNIQUE INDEX IF NOT EXISTS "ProductCombo_storeProductId_key" ON "ProductCombo"("storeProductId")`,
        );
      } catch {
        /* ignore */
      }
      try {
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "Order_fulfillmentStage_idx" ON "Order"("fulfillmentStage")`,
        );
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "Order_fulfillmentStageAt_idx" ON "Order"("fulfillmentStageAt")`,
        );
      } catch {
        /* ignore */
      }
    })().catch((e) => {
      console.error("[ensure-schema]", e);
      ensured = null;
    });
  }
  await ensured;
}
