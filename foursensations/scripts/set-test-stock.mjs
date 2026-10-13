import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const before = await prisma.product.aggregate({
  _count: true,
  _avg: { stock: true },
  _min: { stock: true },
  _max: { stock: true },
});

const result = await prisma.product.updateMany({ data: { stock: 10 } });

const after = await prisma.product.aggregate({
  _count: true,
  _avg: { stock: true },
  _min: { stock: true },
  _max: { stock: true },
});

console.log(JSON.stringify({ before, updated: result.count, after }, null, 2));
await prisma.$disconnect();
