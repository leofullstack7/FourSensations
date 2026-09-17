/**
 * Convierte PNG a WebP optimizado (uso puntual / lotes igora).
 * Uso: node scripts/convert-png-to-webp.mjs <inputDir> <outputDir> [quality]
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const inputDir = path.resolve(process.argv[2] ?? "");
const outputDir = path.resolve(process.argv[3] ?? "");
const quality = Number(process.argv[4] ?? 85);

if (!inputDir || !outputDir) {
  console.error("Uso: node scripts/convert-png-to-webp.mjs <inputDir> <outputDir> [quality]");
  process.exit(1);
}

await fs.mkdir(outputDir, { recursive: true });

const entries = await fs.readdir(inputDir);
const pngs = entries.filter((f) => f.toLowerCase().endsWith(".png")).sort();

let totalIn = 0;
let totalOut = 0;
let ok = 0;
let failed = 0;

for (const file of pngs) {
  const inPath = path.join(inputDir, file);
  const outPath = path.join(outputDir, file.replace(/\.png$/i, ".webp"));
  try {
    const inStat = await fs.stat(inPath);
    await sharp(inPath)
      .webp({ quality, effort: 6, smartSubsample: true })
      .toFile(outPath);
    const outStat = await fs.stat(outPath);
    totalIn += inStat.size;
    totalOut += outStat.size;
    ok += 1;
    const pct = ((1 - outStat.size / inStat.size) * 100).toFixed(1);
    console.log(`${file} → ${path.basename(outPath)} (${(inStat.size / 1024).toFixed(0)} KB → ${(outStat.size / 1024).toFixed(0)} KB, -${pct}%)`);
  } catch (e) {
    failed += 1;
    console.error(`Error en ${file}:`, e instanceof Error ? e.message : e);
  }
}

const savedPct = totalIn > 0 ? ((1 - totalOut / totalIn) * 100).toFixed(1) : "0";
console.log("");
console.log(`Listo: ${ok} convertidas, ${failed} errores`);
console.log(
  `Total: ${(totalIn / 1024 / 1024).toFixed(2)} MB → ${(totalOut / 1024 / 1024).toFixed(2)} MB (ahorro ${savedPct}%)`
);
console.log(`Salida: ${outputDir}`);
