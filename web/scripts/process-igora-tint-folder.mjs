/**
 * Procesa carpetas igora tipo/familia:
 * 1) WebP en raíz (foto color/cabello) → renombrar a *_color.webp
 * 2) PNG/JPG en principales/ → convertir a WebP en la raíz (imagen principal)
 *
 * Uso: node scripts/process-igora-tint-folder.mjs <carpeta> [carpeta2 ...]
 * Ej:  node scripts/process-igora-tint-folder.mjs "../../igora/zero" "../../igora/IRA"
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const QUALITY = 85;
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

const folders = process.argv.slice(2).map((f) => path.resolve(f));
if (folders.length === 0) {
  console.error("Uso: node scripts/process-igora-tint-folder.mjs <carpeta> [carpeta2 ...]");
  process.exit(1);
}

async function renameColorWebps(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let renamed = 0;
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const lower = ent.name.toLowerCase();
    if (!lower.endsWith(".webp")) continue;
    if (/_color\.webp$/i.test(ent.name)) continue;

    const base = ent.name.replace(/\.webp$/i, "");
    const newName = `${base}_color.webp`;
    const from = path.join(dir, ent.name);
    const to = path.join(dir, newName);

    if (await fileExists(to)) {
      console.warn(`  [skip rename] ya existe ${newName}`);
      continue;
    }
    await fs.rename(from, to);
    console.log(`  rename: ${ent.name} → ${newName}`);
    renamed += 1;
  }
  return renamed;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function convertPrincipales(dir) {
  const principalesDir = path.join(dir, "principales");
  let converted = 0;
  let skipped = 0;
  let failed = 0;
  let totalIn = 0;
  let totalOut = 0;

  let entries;
  try {
    entries = await fs.readdir(principalesDir, { withFileTypes: true });
  } catch {
    console.log("  (sin carpeta principales)");
    return { converted, skipped, failed, totalIn, totalOut };
  }

  const images = entries.filter((e) => e.isFile() && IMAGE_EXT.test(e.name)).sort((a, b) => a.name.localeCompare(b.name, "es"));

  for (const ent of images) {
    const inPath = path.join(principalesDir, ent.name);
    const outName = ent.name.replace(IMAGE_EXT, ".webp");
    const outPath = path.join(dir, outName);

    try {
      const inStat = await fs.stat(inPath);
      totalIn += inStat.size;

      if (ent.name.toLowerCase().endsWith(".webp")) {
        if (await fileExists(outPath)) {
          console.warn(`  [skip] ${outName} ya existe en raíz`);
          skipped += 1;
          continue;
        }
        await fs.copyFile(inPath, outPath);
        const outStat = await fs.stat(outPath);
        totalOut += outStat.size;
      } else {
        await sharp(inPath)
          .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
          .toFile(outPath);
        const outStat = await fs.stat(outPath);
        totalOut += outStat.size;
      }

      const pct = ((1 - (await fs.stat(outPath)).size / inStat.size) * 100).toFixed(1);
      console.log(
        `  convert: principales/${ent.name} → ${outName} (${(inStat.size / 1024).toFixed(0)} KB → ${((await fs.stat(outPath)).size / 1024).toFixed(0)} KB, -${pct}%)`
      );
      converted += 1;
      await fs.unlink(inPath);
    } catch (e) {
      failed += 1;
      console.error(`  Error en principales/${ent.name}:`, e instanceof Error ? e.message : e);
    }
  }

  const remaining = (await fs.readdir(principalesDir)).length;
  if (remaining === 0) {
    await fs.rmdir(principalesDir);
    console.log("  carpeta principales/ eliminada (vacía)");
  } else {
    console.warn(`  principales/ aún tiene ${remaining} archivo(s)`);
  }

  return { converted, skipped, failed, totalIn, totalOut };
}

for (const dir of folders) {
  console.log(`\n=== ${path.basename(dir)} (${dir}) ===`);

  const renamed = await renameColorWebps(dir);
  console.log(`  ${renamed} webp renombrados a *_color.webp`);

  const stats = await convertPrincipales(dir);
  const savedPct = stats.totalIn > 0 ? ((1 - stats.totalOut / stats.totalIn) * 100).toFixed(1) : "0";
  console.log(
    `  principales: ${stats.converted} convertidos, ${stats.skipped} omitidos, ${stats.failed} errores` +
      (stats.totalIn > 0 ? ` | ${(stats.totalIn / 1024 / 1024).toFixed(2)} MB → ${(stats.totalOut / 1024 / 1024).toFixed(2)} MB (-${savedPct}%)` : "")
  );
}

console.log("\nListo.");
