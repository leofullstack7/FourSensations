import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PHOTOS_ROOT = path.join(ROOT, "assets", "productos");
const SKU_MAP_PATH = path.join(ROOT, "lib", "product-skus.json");
const MAX_EDGE = 1600;
const WEBP_QUALITY = 82;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff", ".heic", ".heif"]);

function normalizeName(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function sourceFolderLabel(dirName) {
  return dirName.replace(/-\d{8}T\d{6}Z.*$/i, "").trim();
}

function collectImages(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectImages(full, acc);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (IMAGE_EXT.has(ext)) acc.push(full);
  }
  return acc;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function heicToJpegBuffer(inputPath) {
  const convert = (await import("heic-convert")).default;
  const inputBuffer = fs.readFileSync(inputPath);
  return convert({ buffer: inputBuffer, format: "JPEG", quality: 0.92 });
}

async function convertToWebp(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  let input = inputPath;
  if (ext === ".heic" || ext === ".heif") {
    input = await heicToJpegBuffer(inputPath);
  }

  await sharp(input, { failOn: "none" })
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4, smartSubsample: true })
    .toFile(outputPath);
}

async function main() {
  const skuTable = JSON.parse(fs.readFileSync(SKU_MAP_PATH, "utf8"));
  const byNorm = new Map();
  for (const entry of skuTable) {
    const keys = [entry.name, ...(entry.aliases ?? [])].map(normalizeName);
    for (const key of keys) byNorm.set(key, entry);
  }

  const sourceDirs = fs
    .readdirSync(PHOTOS_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !name.startsWith("_") && !name.startsWith("."));

  const unmatched = [];
  const jobs = [];

  for (const dirName of sourceDirs) {
    if (/^FS\d{3}\b/.test(dirName)) continue;
    const label = sourceFolderLabel(dirName);
    const entry = byNorm.get(normalizeName(label));
    if (!entry) {
      unmatched.push(dirName);
      continue;
    }
    jobs.push({
      sku: entry.sku,
      name: entry.name,
      from: path.join(PHOTOS_ROOT, dirName),
      to: path.join(PHOTOS_ROOT, `${entry.sku} ${entry.name}`),
    });
  }

  if (unmatched.length) {
    console.error("Carpetas sin SKU:");
    for (const name of unmatched) console.error(`  - ${name}`);
    process.exit(1);
  }

  let totalBefore = 0;
  let totalAfter = 0;
  let converted = 0;
  let failed = 0;

  for (const job of jobs) {
    const images = collectImages(job.from).sort((a, b) =>
      path.basename(a).localeCompare(path.basename(b), "es", { numeric: true, sensitivity: "base" }),
    );
    if (images.length === 0) {
      console.warn(`Sin imágenes: ${job.from}`);
      continue;
    }

    const tmpOut = `${job.to}.__tmp`;
    if (fs.existsSync(tmpOut)) fs.rmSync(tmpOut, { recursive: true, force: true });
    fs.mkdirSync(tmpOut, { recursive: true });

    console.log(`\n${job.sku} ${job.name}  (${images.length} fotos)`);

    let index = 1;
    for (const inputPath of images) {
      const outName = `${job.sku}-${index}.webp`;
      const outputPath = path.join(tmpOut, outName);
      const before = fs.statSync(inputPath).size;
      totalBefore += before;
      try {
        await convertToWebp(inputPath, outputPath);
        const after = fs.statSync(outputPath).size;
        totalAfter += after;
        converted += 1;
        console.log(
          `  ${path.basename(inputPath)} → ${outName}  ${formatBytes(before)} → ${formatBytes(after)}`,
        );
        index += 1;
      } catch (err) {
        failed += 1;
        console.error(`  FALLO ${path.basename(inputPath)}: ${err instanceof Error ? err.message : err}`);
      }
    }

    if (index === 1) {
      fs.rmSync(tmpOut, { recursive: true, force: true });
      continue;
    }

    if (fs.existsSync(job.to)) fs.rmSync(job.to, { recursive: true, force: true });
    fs.renameSync(tmpOut, job.to);
    if (path.resolve(job.from) !== path.resolve(job.to)) {
      fs.rmSync(job.from, { recursive: true, force: true });
    }
  }

  const saved = Math.max(0, totalBefore - totalAfter);
  const savedPercent = totalBefore > 0 ? Math.round((saved / totalBefore) * 100) : 0;
  console.log(
    `\nListo: ${converted} WebP, ${failed} error(es), ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (−${savedPercent}%)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
