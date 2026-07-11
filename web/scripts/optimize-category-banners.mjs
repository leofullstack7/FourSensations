import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC_DIR = path.join(ROOT, "productos/imagenes/banners");
const OUT_DIR = path.join(import.meta.dirname, "../public/categorias/banners");

const MAP = [
  ["maquillaje-banner.png", "maquillaje.webp"],
  ["cuidadopiel-banner.png.png", "cuidado-piel.webp"],
  ["cuidadocapilar-banner.png", "cuidado-capilar.webp"],
  ["unas-banner.png", "unas.webp"],
  ["hombres-banner.png", "hombres.webp"],
  ["accesorios-banner.png", "accesorios.webp"],
];

const WEBP_QUALITY = 82;

await fs.mkdir(OUT_DIR, { recursive: true });

for (const [srcName, outName] of MAP) {
  const srcPath = path.join(SRC_DIR, srcName);
  const outPath = path.join(OUT_DIR, outName);
  const input = await fs.readFile(srcPath);
  await sharp(input).rotate().webp({ quality: WEBP_QUALITY, effort: 4 }).toFile(outPath);
  const outStat = await fs.stat(outPath);
  console.log(`${srcName} -> ${outName} (${Math.round(outStat.size / 1024)} KB)`);
}

console.log("Done.");
