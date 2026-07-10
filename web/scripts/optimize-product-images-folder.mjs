import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"];
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const WEBP_QUALITY = 82;

function stemImageName(filename) {
  let base = filename;
  let changed = true;
  while (changed) {
    changed = false;
    const lower = base.toLowerCase();
    for (const ext of IMAGE_EXT) {
      if (lower.endsWith(ext)) {
        base = base.slice(0, -ext.length);
        changed = true;
        break;
      }
    }
  }
  return base;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const targetDir = path.resolve(
  process.argv[2] ?? path.join(__dirname, "../../productos/imagenes/color1")
);

if (!fs.existsSync(targetDir)) {
  console.error(`Carpeta no encontrada: ${targetDir}`);
  process.exit(1);
}

const entries = fs.readdirSync(targetDir, { withFileTypes: true });
const files = entries
  .filter((e) => e.isFile())
  .map((e) => e.name)
  .filter((name) => {
    const lower = name.toLowerCase();
    return IMAGE_EXT.some((ext) => lower.endsWith(ext));
  })
  .sort();

if (files.length === 0) {
  console.log("No hay imágenes para convertir.");
  process.exit(0);
}

let totalBefore = 0;
let totalAfter = 0;
const results = [];

for (const file of files) {
  const inputPath = path.join(targetDir, file);
  const stem = stemImageName(file);
  const outputPath = path.join(targetDir, `${stem}.webp`);
  const before = fs.statSync(inputPath).size;
  totalBefore += before;

  if (file.toLowerCase().endsWith(".webp") && before <= 180_000) {
    totalAfter += before;
    results.push({ file, skipped: true, before, after: before });
    continue;
  }

  try {
    const meta = await sharp(inputPath).metadata();
    await sharp(inputPath)
      .rotate()
      .resize(MAX_WIDTH, MAX_HEIGHT, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(outputPath);

    const after = fs.statSync(outputPath).size;
    totalAfter += after;

    if (path.resolve(inputPath) !== path.resolve(outputPath)) {
      fs.unlinkSync(inputPath);
    }

    results.push({
      file,
      out: `${stem}.webp`,
      width: meta.width,
      height: meta.height,
      before,
      after,
      savedPercent: before > 0 ? Math.round(((before - after) / before) * 100) : 0,
    });
  } catch (err) {
    console.error(`Error en ${file}:`, err instanceof Error ? err.message : err);
    totalAfter += before;
  }
}

console.log(`\nCarpeta: ${targetDir}\n`);
for (const r of results) {
  if (r.skipped) {
    console.log(`⊘ ${r.file} — ya optimizado (${formatBytes(r.before)})`);
    continue;
  }
  console.log(
    `✓ ${r.file} → ${r.out} (${r.width}x${r.height}) ${formatBytes(r.before)} → ${formatBytes(r.after)} (−${r.savedPercent}%)`
  );
}

const saved = Math.max(0, totalBefore - totalAfter);
const savedPercent = totalBefore > 0 ? Math.round((saved / totalBefore) * 100) : 0;
console.log(
  `\nTotal: ${results.filter((r) => !r.skipped).length} convertida(s), ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (−${savedPercent}%)`
);
