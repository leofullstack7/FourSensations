/**
 * Copia WebP de assets/productos → public/media/productos/{SKU}/
 * para servirlos como estáticos (sin pasar por Node/Sharp en cada request).
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());
const srcRoot = join(root, "assets", "productos");
const destRoot = join(root, "public", "media", "productos");

const SKU_DIR = /^(FS\d{3})(?:\s|$)/i;
const FILE_RE = /^FS\d{3}-\d+\.webp$/i;

function listSkuDirs() {
  if (!existsSync(srcRoot)) return [];
  return readdirSync(srcRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
}

function main() {
  if (!existsSync(srcRoot)) {
    console.warn("[publish-product-media] No hay assets/productos; se omite.");
    return;
  }

  if (existsSync(destRoot)) {
    rmSync(destRoot, { recursive: true, force: true });
  }
  mkdirSync(destRoot, { recursive: true });

  let files = 0;
  let bytes = 0;

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
      const from = join(srcDir, name);
      const to = join(destDir, name);
      cpSync(from, to);
      files += 1;
      bytes += statSync(to).size;
    }
  }

  console.log(
    `[publish-product-media] ${files} archivos → public/media/productos (${(bytes / (1024 * 1024)).toFixed(1)} MB)`,
  );
}

main();
