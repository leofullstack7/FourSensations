import { config as loadEnv } from "dotenv";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();
const skuTable = JSON.parse(readFileSync(resolve(process.cwd(), "lib/product-skus.json"), "utf8"));

function listProductPhotoFiles(sku) {
  const root = resolve(process.cwd(), "assets", "productos");
  if (!existsSync(root)) return [];
  const code = sku.toUpperCase();
  const dirEnt = readdirSync(root, { withFileTypes: true }).find((entry) => {
    if (!entry.isDirectory()) return false;
    const name = entry.name.toUpperCase();
    return name === code || name.startsWith(`${code} `);
  });
  if (!dirEnt) return [];
  return readdirSync(join(root, dirEnt.name))
    .filter((name) => /^FS\d{3}-\d+\.webp$/i.test(name))
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

function productMediaPublicUrl(sku, fileName) {
  return `/api/media/productos/${sku}/${fileName}`;
}

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function categoryFor(entry) {
  const name = entry.name;
  if (String(name).startsWith("Kit")) return { category: "mayorista", subcategory: "Kit Capilar" };
  if (name === "Accesorios" || String(name).includes("Cepillo")) {
    return { category: "accesorios", subcategory: "Cepillos" };
  }
  if (name === "Crema Autobronceadora") return { category: "cuidado-capilar", subcategory: "Multiuso" };
  if (name === "Scrub Glow") return { category: "cuidado-capilar", subcategory: "Tratamientos" };
  if (name === "Brumas capilares") return { category: "cuidado-capilar", subcategory: "Fragancias" };
  return { category: "cuidado-capilar", subcategory: name };
}

function namesFor(entry) {
  return [entry.name, ...(entry.aliases ?? [])].filter(Boolean);
}

function mediaUrls(sku) {
  return listProductPhotoFiles(sku).map((file) => productMediaPublicUrl(sku, file));
}

async function uniqueSlug(base) {
  let slug = base || "producto";
  let n = 2;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

async function main() {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of skuTable) {
    const urls = mediaUrls(entry.sku);
    if (urls.length === 0 && entry.kind !== "catalog") {
      skipped += 1;
      continue;
    }
    if (
      ["Empaques Four Sensations", "Navidad Four Sensations", "Explosión de chocolate 2025", "Sachets"].includes(
        entry.name,
      )
    ) {
      skipped += 1;
      continue;
    }
    const names = namesFor(entry);
    let product = await prisma.product.findFirst({
      where: {
        OR: [{ externalRef: entry.sku }, ...names.map((name) => ({ name: { equals: name, mode: "insensitive" } }))],
      },
      include: { images: true },
    });

    const cats = categoryFor(entry);
    const imageUrl = urls[0] ?? null;
    const extra = urls.slice(1);

    if (!product) {
      if (entry.kind !== "catalog" && urls.length === 0) {
        skipped += 1;
        continue;
      }
      product = await prisma.product.create({
        data: {
          slug: await uniqueSlug(slugify(entry.name)),
          name: entry.name,
          brand: "Four Sensations",
          category: cats.category,
          subcategory: cats.subcategory,
          description: `Four Sensations · ${entry.name}.`,
          price: 0,
          stock: 0,
          emoji: "✨",
          externalRef: entry.sku,
          imageUrl,
          featuredInHome: entry.kind === "catalog",
          images: extra.length
            ? { create: extra.map((url, sortOrder) => ({ url, sortOrder })) }
            : undefined,
        },
      });
      created += 1;
      console.log(`creado ${entry.sku} ${entry.name} (${urls.length} fotos)`);
      continue;
    }

    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: {
          externalRef: product.externalRef || entry.sku,
          imageUrl,
        },
      }),
      prisma.productImage.deleteMany({ where: { productId: product.id } }),
      ...(extra.length
        ? [
            prisma.productImage.createMany({
              data: extra.map((url, sortOrder) => ({ productId: product.id, url, sortOrder })),
            }),
          ]
        : []),
    ]);
    updated += 1;
    console.log(`fotos ${entry.sku} ${entry.name} (${urls.length})`);
  }

  console.log(`Listo: creados=${created} actualizados=${updated} omitidos=${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
