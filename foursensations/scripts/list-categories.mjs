import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const rows = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true, sortOrder: true },
  });
  console.log("Categorías en DB local:", rows.length);
  for (const r of rows) console.log(` - ${r.name} (${r.slug})`);
  const tintes = rows.find((r) => r.slug === "tintes");
  console.log(tintes ? "✓ Tintes presente" : "✗ Tintes NO está en esta base de datos");
} finally {
  await prisma.$disconnect();
}
