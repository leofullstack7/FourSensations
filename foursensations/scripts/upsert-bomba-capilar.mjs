/**
 * Crea / actualiza el producto Bomba Capilar (Pre-Shampoo) en Neon.
 * Uso: cd foursensations && npx tsx scripts/upsert-bomba-capilar.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

const NAME = "Bomba Capilar";
const SLUG = "bomba-capilar";

async function main() {
  const dulce = await prisma.product.findFirst({
    where: { name: { contains: "Dulce Renacer", mode: "insensitive" } },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 4 } },
  });
  const primaveral = await prisma.product.findFirst({
    where: {
      OR: [
        { name: { contains: "Sensación Primaveral", mode: "insensitive" } },
        { name: { contains: "Sensacion Primaveral", mode: "insensitive" } },
        { name: { contains: "Repolarizador", mode: "insensitive" } },
      ],
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 2 } },
  });

  const imageUrl = dulce?.imageUrl || primaveral?.imageUrl || null;
  const gallery = [
    ...(dulce?.images.map((i) => i.url) ?? []),
    ...(primaveral?.images.map((i) => i.url) ?? []),
  ].filter(Boolean);

  const description =
    "Pre-shampoo Four Sensations: la dupla Dulce Renacer + Repolarizador Capilar antes del lavado. Prepara la fibra, nutre y deja el cabello listo para la rutina. 💗";

  const product = await prisma.product.upsert({
    where: { slug: SLUG },
    create: {
      slug: SLUG,
      name: NAME,
      brand: "Four Sensations",
      category: "cuidado-capilar",
      subcategory: "Pre - Shampoo",
      description,
      price: dulce?.price && primaveral?.price ? dulce.price + primaveral.price : dulce?.price ?? 89000,
      originalPrice: null,
      stock: 50,
      rating: 4.9,
      reviews: 12,
      badge: "new",
      emoji: "💥",
      isNew: true,
      featuredInHome: true,
      active: true,
      imageUrl,
      tags: ["pre-shampoo", "bomba", "dulce renacer", "repolarizador"],
    },
    update: {
      name: NAME,
      subcategory: "Pre - Shampoo",
      category: "cuidado-capilar",
      description,
      active: true,
      featuredInHome: true,
      ...(imageUrl ? { imageUrl } : {}),
    },
  });

  if (gallery.length > 0) {
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: gallery.slice(0, 8).map((url, sortOrder) => ({
        productId: product.id,
        url,
        sortOrder,
      })),
    });
  }

  console.log("OK Bomba Capilar:", product.id, product.slug);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
