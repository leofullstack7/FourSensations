/**
 * Quita fondo blanco, recorta y optimiza favicon.png para pestañas del navegador.
 * Uso: node scripts/optimize-favicon.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const inputPath = join(root, "public", "favicon.png");
const publicOut = join(root, "public", "favicon.png");
const appIconOut = join(root, "app", "icon.png");
const appleIconOut = join(root, "app", "apple-icon.png");

/** Umbral: píxeles casi blancos → transparentes (conserva el rosa/dorado del logo). */
const WHITE_THRESHOLD = 248;

function removeWhiteBackground(rgba, width, height) {
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      rgba[i + 3] = 0;
    }
  }

  // Flood-fill desde bordes por si quedan zonas blancas internas (poco probable)
  const visited = new Uint8Array(width * height);
  const queue = [];

  const pushIfWhite = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = (y * width + x) * 4;
    const vi = y * width + x;
    if (visited[vi]) return;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      visited[vi] = 1;
      queue.push([x, y]);
    }
  };

  for (let x = 0; x < width; x++) {
    pushIfWhite(x, 0);
    pushIfWhite(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfWhite(0, y);
    pushIfWhite(width - 1, y);
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    const idx = (y * width + x) * 4;
    rgba[idx + 3] = 0;
    pushIfWhite(x - 1, y);
    pushIfWhite(x + 1, y);
    pushIfWhite(x, y - 1);
    pushIfWhite(x, y + 1);
  }
}

async function buildIcon(size, outPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgba = Buffer.from(data);
  removeWhiteBackground(rgba, info.width, info.height);

  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toFile(outPath);
}

async function main() {
  const before = readFileSync(inputPath).length;

  // Favicon principal (32px ideal para pestañas; Next genera variantes desde app/icon.png)
  await buildIcon(512, appIconOut);
  await buildIcon(180, appleIconOut);

  // public/favicon.png optimizado (32px, liviano para /favicon.png directo)
  await buildIcon(32, publicOut);

  const afterPublic = readFileSync(publicOut).length;
  const afterApp = readFileSync(appIconOut).length;

  console.log(`Original: ${(before / 1024).toFixed(1)} KB`);
  console.log(`public/favicon.png (32px): ${(afterPublic / 1024).toFixed(1)} KB`);
  console.log(`app/icon.png (512px): ${(afterApp / 1024).toFixed(1)} KB`);
  console.log(`app/apple-icon.png (180px): ${(readFileSync(appleIconOut).length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
