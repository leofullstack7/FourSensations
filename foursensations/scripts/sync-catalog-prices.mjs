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

function normalizeMenuLookup(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Precios mayorista oficiales (COP) — misma fuente que wholesale-pricing.ts */
const WHOLESALE_BY_KEY = {
  "dulce renacer": 26600,
  "sensacion primaveral": 25200,
  "tentacion equilibrio": 40600,
  "kit tentacion equilibrio": 40600,
  "tentacion nutricion": 40600,
  "kit tentacion nutricion": 40600,
  "scalp therapy": 40600,
  "kit scalp therapy": 40600,
  "scrub glow": 48300,
  "exfoliante capilar detox": 48300,
  botanical: 25900,
  "shampoo botanical": 25900,
  "cepillo masajeador capilar": 15400,
  cepillo: 15400,
  "fantasia natural": 26600,
  "luna llena": 24500,
  suspiros: 24500,
  "secreto de primavera": 35000,
  "proteina 10 en 1": 29400,
  "proteina capilar": 29400,
  "proteina capilar 10 en 1": 29400,
  "shine gloss": 25900,
  "brumas capilares": 28000,
  "perfumes capilares": 28000,
  "bloom shine": 28000,
  bloomshine: 28000,
  "sweet love": 28000,
  scarlette: 28000,
  "golden glow": 28000,
  shots: 48300,
  "shots capilares": 48300,
  "shots x3": 48300,
  "bomba capilar": 51800,
};

/** Fallbacks de precio público cuando el JSON no trae hint */
const PUBLIC_FALLBACK = {
  "scalp therapy": 58000,
  "luna llena": 35000,
  "bomba capilar": 74000,
};

function parsePublicHint(raw) {
  if (!raw || typeof raw !== "string") return null;
  const n = Number(String(raw).replace(/\./g, "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function lookupWholesale(name) {
  const key = normalizeMenuLookup(name);
  if (WHOLESALE_BY_KEY[key]) return WHOLESALE_BY_KEY[key];
  for (const [alias, price] of Object.entries(WHOLESALE_BY_KEY)) {
    if (key.includes(alias) || alias.includes(key)) return price;
  }
  return null;
}

function buildPublicIndex() {
  const map = new Map();
  for (const [name, entry] of Object.entries(catalogJson)) {
    const price = parsePublicHint(entry.pricePublicHint);
    if (price) map.set(normalizeMenuLookup(name), price);
    for (const alias of entry.aliases ?? []) {
      if (price) map.set(normalizeMenuLookup(alias), price);
    }
  }
  for (const [k, v] of Object.entries(PUBLIC_FALLBACK)) {
    if (!map.has(k)) map.set(k, v);
  }
  return map;
}

function lookupPublic(name, index) {
  const key = normalizeMenuLookup(name);
  if (index.has(key)) return index.get(key);
  for (const [alias, price] of index.entries()) {
    if (key.includes(alias) || alias.includes(key)) return price;
  }
  return null;
}

const prisma = new PrismaClient();

async function main() {
  const dry = process.argv.includes("--dry");
  const publicIndex = buildPublicIndex();
  const products = await prisma.product.findMany({
    select: { id: true, name: true, price: true, originalPrice: true, discountPercent: true },
    orderBy: { name: "asc" },
  });

  const updates = [];
  for (const p of products) {
    const publicPrice = lookupPublic(p.name, publicIndex);
    const wholesale = lookupWholesale(p.name);
    if (!publicPrice) {
      console.log("SKIP (sin precio catálogo):", p.name, "actual=", p.price);
      continue;
    }
    if (p.price === publicPrice && !p.discountPercent) {
      console.log("OK ya actualizado:", p.name, publicPrice, wholesale ? `mayorista ${wholesale}` : "");
      continue;
    }
    updates.push({
      id: p.id,
      name: p.name,
      from: p.price,
      to: publicPrice,
      wholesale,
    });
  }

  console.log(JSON.stringify({ total: products.length, toUpdate: updates.length, dry }, null, 2));
  for (const u of updates) {
    console.log(`UPDATE ${u.name}: ${u.from} → ${u.to}` + (u.wholesale ? ` (mayorista ${u.wholesale})` : ""));
    if (!dry) {
      await prisma.product.update({
        where: { id: u.id },
        data: {
          price: u.to,
          // Limpia “ofertas” residuales para que se vea el precio real de catálogo
          originalPrice: null,
          discountPercent: null,
          discountEndsAt: null,
          discountBasePrice: null,
        },
      });
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
