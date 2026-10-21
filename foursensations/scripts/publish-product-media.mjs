/**
 * Copia/optimiza WebP de assets/productos → public/media/productos/{SKU}/
 * para servirlos como estáticos (sin Node/Sharp en cada request).
 * Redimensiona a máx. 800px de ancho (cards retina) para bajar peso y latencia.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(process.cwd());
const srcRoot = join(root, "assets", "productos");
const destRoot = join(root, "public", "media", "productos");

const SKU_DIR = /^(FS\d{3})(?:\s|$)/i;
const FILE_RE = /^FS\d{3}-\d+\.webp$/i;
const MAX_WIDTH = 800;
const WEBP_QUALITY = 72;
const CONCURRENCY = 6;

function listSkuDirs() {
  if (!existsSync(srcRoot)) return [];
  return readdirSync(srcRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
}

async function mapPool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

async function optimizeOne(from, to) {
  await sharp(from)
    .rotate()
    .resize({ width: MAX_WIDTH, height: MAX_WIDTH * 2, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(to);
}

async function main() {
  if (!existsSync(srcRoot)) {
    console.warn("[publish-product-media] No hay assets/productos; se omite.");
    return;
  }

  if (existsSync(destRoot)) {
    rmSync(destRoot, { recursive: true, force: true });
  }
  mkdirSync(destRoot, { recursive: true });

  /** @type {{ from: string, to: string }[]} */
  const jobs = [];

  for (const dirEnt of listSkuDirs()) {
    const m = dirEnt.name.match(SKU_DIR);
    if (!m) continue;
    const sku = m[1].toUpperCase();
    const srcDir = join(srcRoot, dirEnt.name);
    const destDir = join(destRoot, sku);
    mkdirSync(destDir, { recursive: true });

    for (const name of readdirSync(srcDir)) {
      if (!FILE_RE.test(name)) continue;
      if (!name.toUpperCase().startsWith(`${sku}-`)) continue;
      jobs.push({ from: join(srcDir, name), to: join(destDir, name) });
    }
  }

  let files = 0;
  let bytes = 0;
  await mapPool(jobs, CONCURRENCY, async (job) => {
    await optimizeOne(job.from, job.to);
    files += 1;
    bytes += statSync(job.to).size;
  });

  console.log(
    `[publish-product-media] ${files} archivos → public/media/productos (${(bytes / (1024 * 1024)).toFixed(1)} MB, max ${MAX_WIDTH}px)`,
  );
}

main().catch((err) => {
  console.error("[publish-product-media]", err);
  process.exit(1);
});
