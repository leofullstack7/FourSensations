import fs from "node:fs";
import path from "node:path";
import productSkus from "@/lib/product-skus.json";
import { preferFastStorefrontUrls, toFastProductMediaUrl } from "@/lib/util/image-url";

const SKU_RE = /^FS\d{3}$/i;
const FILE_RE = /^FS\d{3}-\d+\.webp$/i;

type SkuEntry = { sku: string; name: string; aliases?: string[] };

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
  const match = url.trim().match(/\/(?:api\/media|media)\/productos\/(FS\d{3})\//i);
  return match ? match[1]!.toUpperCase() : null;
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findSkuByProductName(name: string): string | null {
  const key = normalizeKey(name);
  if (!key) return null;

  let best: { sku: string; len: number } | null = null;
  for (const entry of productSkus as SkuEntry[]) {
    const names = [entry.name, ...(entry.aliases ?? [])];
    for (const n of names) {
      const listed = normalizeKey(n);
      if (!listed) continue;
      if (key === listed) return entry.sku.toUpperCase();
      if (key.includes(listed) || listed.includes(key)) {
        if (!best || listed.length > best.len) {
          best = { sku: entry.sku.toUpperCase(), len: listed.length };
        }
      }
    }
  }
  if (best) return best.sku;

  const root = productPhotosRoot();
  if (!fs.existsSync(root)) return null;
  const hit = fs.readdirSync(root, { withFileTypes: true }).find((entry) => {
    if (!entry.isDirectory()) return false;
    const rest = entry.name.replace(/^FS\d{3}\s+/i, "").trim();
    if (!rest) return false;
    return normalizeKey(rest) === key;
  });
  if (!hit) return null;
  const sku = hit.name.match(/^(FS\d{3})/i);
  return sku ? sku[1]!.toUpperCase() : null;
}

/**
 * Completa con WebP locales del SKU y prioriza estáticos sobre `/api/media/stored`
 * (evita portadas lentas/rotas en categorías).
 */
export function mergeLocalProductPhotoUrls(productName: string, urls: string[]): string[] {
  const sku = urls.map(skuFromMediaUrl).find(Boolean) || findSkuByProductName(productName);
  const normalized = preferFastStorefrontUrls(urls.map((u) => toFastProductMediaUrl(u.trim())).filter(Boolean));
  if (!sku) return normalized;
  const extras = listProductPhotoFiles(sku).map((file) => `/media/productos/${sku}/${file}`);
  if (extras.length === 0) return normalized;
  return preferFastStorefrontUrls([...extras, ...normalized]);
}

export function listSkuMediaUrls(sku: string): string[] {
  const code = sku.trim().toUpperCase();
  return listProductPhotoFiles(code).map((file) => `/media/productos/${code}/${file}`);
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
