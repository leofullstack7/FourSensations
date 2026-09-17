import fs from "node:fs";
import path from "node:path";

const SKU_RE = /^FS\d{3}$/i;
const FILE_RE = /^FS\d{3}-\d+\.webp$/i;

export function productPhotosRoot(): string {
  return path.join(process.cwd(), "assets", "productos");
}

export function findProductPhotoDir(sku: string): string | null {
  const code = sku.trim().toUpperCase();
  if (!SKU_RE.test(code)) return null;
  const root = productPhotosRoot();
  if (!fs.existsSync(root)) return null;
  const hit = fs.readdirSync(root, { withFileTypes: true }).find((entry) => {
    if (!entry.isDirectory()) return false;
    const name = entry.name.toUpperCase();
    return name === code || name.startsWith(`${code} `);
  });
  return hit ? path.join(root, hit.name) : null;
}

export function listProductPhotoFiles(sku: string): string[] {
  const dir = findProductPhotoDir(sku);
  if (!dir) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => FILE_RE.test(name))
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

function skuFromMediaUrl(url: string): string | null {
  const match = url.trim().match(/\/api\/media\/productos\/(FS\d{3})\//i);
  return match ? match[1]!.toUpperCase() : null;
}

function findSkuByProductName(name: string): string | null {
  const root = productPhotosRoot();
  if (!fs.existsSync(root)) return null;
  const key = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!key) return null;
  const hit = fs.readdirSync(root, { withFileTypes: true }).find((entry) => {
    if (!entry.isDirectory()) return false;
    const rest = entry.name.replace(/^FS\d{3}\s+/i, "").trim();
    if (!rest) return false;
    const folderKey = rest
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    return folderKey === key;
  });
  if (!hit) return null;
  const sku = hit.name.match(/^(FS\d{3})/i);
  return sku ? sku[1]!.toUpperCase() : null;
}

/** Completa la galería con todos los WebP locales del SKU (sin duplicar lo que ya viene de DB). */
export function mergeLocalProductPhotoUrls(productName: string, urls: string[]): string[] {
  const sku = urls.map(skuFromMediaUrl).find(Boolean) || findSkuByProductName(productName);
  if (!sku) return urls;
  const extras = listProductPhotoFiles(sku).map(
    (file) => `/api/media/productos/${sku}/${file}`,
  );
  if (extras.length === 0) return urls;
  const seen = new Set(urls.map((u) => u.trim()).filter(Boolean));
  const merged = [...urls.filter((u) => u.trim())];
  for (const url of extras) {
    if (seen.has(url)) continue;
    seen.add(url);
    merged.push(url);
  }
  return merged;
}

export function listSkuMediaUrls(sku: string): string[] {
  const code = sku.trim().toUpperCase();
  return listProductPhotoFiles(code).map((file) => `/api/media/productos/${code}/${file}`);
}

export function resolveProductPhotoFile(sku: string, fileName: string): string | null {
  const code = sku.trim().toUpperCase();
  const file = path.basename(fileName);
  if (!SKU_RE.test(code) || !FILE_RE.test(file)) return null;
  if (!file.toUpperCase().startsWith(`${code}-`)) return null;
  const dir = findProductPhotoDir(code);
  if (!dir) return null;
  const full = path.join(dir, file);
  if (!fs.existsSync(full) || !full.startsWith(dir)) return null;
  return full;
}
