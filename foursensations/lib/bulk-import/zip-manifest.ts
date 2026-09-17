import AdmZip from "adm-zip";
import path from "node:path";
import { IMAGE_EXT } from "./constants";
import { normalizeKey } from "./normalize";

export type ZipImageEntry = {
  /** Ruta dentro del ZIP (puede incluir carpetas). */
  entryName: string;
  /** Solo nombre de archivo. */
  fileName: string;
  /** Nombre base sin extensión. */
  baseName: string;
  /** Código inferido del nombre base (ver `toRawImageCode`). */
  rawImageCode: string;
  /** Prefijo numérico inicial continuo (si existe). */
  numericPrefixCode: string | null;
  /** rawImageCode normalizado para matching. */
  normalizedRawCode: string;
  /** numericPrefixCode normalizado para matching. */
  normalizedNumericPrefixCode: string | null;
  buffer: Buffer;
};

function toRawImageCode(baseName: string): string {
  let upper = baseName.trim().toUpperCase();
  if (!upper) return "";

  // Sufijos de variante de imagen (tintes / galería): 5-0_COLOR, 5-0_1 → código base 5-0.
  upper = upper.replace(/[-_]COLOR$/i, "");
  upper = upper.replace(/_\d+$/i, "");
  upper = upper.replace(/[-_]COLOR$/i, "");
  upper = upper.replace(/_\d+$/i, "");

  // Referencias con segmentos unidos por guión (p. ej. C1-ROJ-SHA, 5-0, 9,5-1).
  if (/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(upper) || /^\d+[.,]\d+(?:-[A-Z0-9]+)?$/.test(upper)) {
    return upper;
  }

  // Tokens robustos: soporta "_", "-", espacios y otros separadores.
  const tokens = upper
    .split(/[^A-Z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Códigos tipo SKU / referencia (p. ej. AGV17144, SKU12345): 2+ letras y luego al menos un dígito.
  // Debe ir ANTES del filtro digit-led: nombres como "AGV17144 #5" tokenizan en ["AGV17144","5"]
  // y el "5" no debe ganar frente al código real.
  const letterPrefixSku = tokens.filter((t) => /^[A-Z]{2,}\d/.test(t));
  if (letterPrefixSku.length > 0) {
    letterPrefixSku.sort((a, b) => b.length - a.length);
    return letterPrefixSku[0]!;
  }

  // Candidatos tipo código: empiezan por número y pueden llevar sufijo alfanumérico.
  const codeLike = tokens.filter((t) => /^\d+[A-Z0-9]*$/.test(t));
  if (codeLike.length > 0) {
    // Preferir el más "código": mayor prefijo numérico; empate por token más largo.
    codeLike.sort((a, b) => {
      const an = (a.match(/^\d+/)?.[0].length ?? 0);
      const bn = (b.match(/^\d+/)?.[0].length ?? 0);
      if (bn !== an) return bn - an;
      if (b.length !== a.length) return b.length - a.length;
      return 0;
    });
    return codeLike[0]!;
  }

  // Fallback: token alfanumérico más largo.
  if (tokens.length > 0) {
    return [...tokens].sort((a, b) => b.length - a.length)[0]!;
  }
  return upper;
}

function toNumericPrefixCode(rawImageCode: string): string | null {
  const m = rawImageCode.match(/^\d+/);
  if (!m?.[0]) return null;
  return m[0];
}

function isIgnoredPath(entryName: string): boolean {
  const lower = entryName.toLowerCase();
  if (lower.includes("__macosx")) return true;
  if (lower.endsWith(".ds_store")) return true;
  return false;
}

export type ZipManifestItem = {
  entryName: string;
  fileName?: string;
};

/** Construye una entrada de match a partir del path (sin leer bytes). */
export function zipImageEntryFromPath(entryName: string, buffer: Buffer = Buffer.alloc(0)): ZipImageEntry | null {
  const normalized = entryName.replace(/\\/g, "/");
  if (isIgnoredPath(normalized)) return null;
  const ext = path.extname(normalized).toLowerCase();
  if (!IMAGE_EXT.has(ext)) return null;
  const fileName = path.basename(normalized);
  const base = path.basename(normalized, ext);
  const rawImageCode = toRawImageCode(base);
  const numericPrefixCode = toNumericPrefixCode(rawImageCode);
  return {
    entryName: normalized,
    fileName,
    baseName: base,
    rawImageCode,
    numericPrefixCode,
    normalizedRawCode: normalizeKey(rawImageCode),
    normalizedNumericPrefixCode: numericPrefixCode ? normalizeKey(numericPrefixCode) : null,
    buffer,
  };
}

/** Match CSV↔ZIP sin subir el archivo: solo nombres de imagen. */
export function listZipImagesFromManifest(items: ZipManifestItem[]): ZipImageEntry[] {
  const entries: ZipImageEntry[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const name = (item.entryName || item.fileName || "").trim();
    if (!name) continue;
    const ent = zipImageEntryFromPath(name);
    if (!ent) continue;
    const key = ent.entryName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(ent);
  }
  return entries;
}

function indexZipEntries(entries: ZipImageEntry[]) {
  const byNormalizedRawCode = new Map<string, ZipImageEntry[]>();
  const byNumericPrefixCode = new Map<string, ZipImageEntry[]>();
  const byFileName = new Map<string, ZipImageEntry>();
  for (const ent of entries) {
    byFileName.set(ent.fileName, ent);
    {
      const list = byNormalizedRawCode.get(ent.normalizedRawCode) ?? [];
      list.push(ent);
      byNormalizedRawCode.set(ent.normalizedRawCode, list);
    }
    if (ent.normalizedNumericPrefixCode) {
      const list = byNumericPrefixCode.get(ent.normalizedNumericPrefixCode) ?? [];
      list.push(ent);
      byNumericPrefixCode.set(ent.normalizedNumericPrefixCode, list);
    }
  }
  Array.from(byNormalizedRawCode.values()).forEach((list) => {
    list.sort((a: ZipImageEntry, b: ZipImageEntry) => a.fileName.localeCompare(b.fileName));
  });
  Array.from(byNumericPrefixCode.values()).forEach((list) => {
    list.sort((a: ZipImageEntry, b: ZipImageEntry) => a.fileName.localeCompare(b.fileName));
  });
  return { byNormalizedRawCode, byNumericPrefixCode, byFileName, entries };
}

/**
 * Lista imágenes del ZIP y agrupa por clave normalizada (basename).
 * @param options.includeBuffers Si false (preview), no lee bytes de cada imagen → mucho menos RAM/CPU.
 */
export function listZipImages(
  zipBuffer: Buffer,
  options?: { includeBuffers?: boolean },
): {
  byNormalizedRawCode: Map<string, ZipImageEntry[]>;
  byNumericPrefixCode: Map<string, ZipImageEntry[]>;
  byFileName: Map<string, ZipImageEntry>;
  entries: ZipImageEntry[];
} {
  const includeBuffers = options?.includeBuffers !== false;
  try {
    const zip = new AdmZip(zipBuffer);
    const entries: ZipImageEntry[] = [];
    for (const e of zip.getEntries()) {
      if (e.isDirectory) continue;
      const buf = includeBuffers ? e.getData() : Buffer.alloc(0);
      const ent = zipImageEntryFromPath(e.entryName.replace(/\\/g, "/"), buf);
      if (ent) entries.push(ent);
    }
    return indexZipEntries(entries);
  } catch (admErr) {
    console.warn("[zip-manifest] AdmZip falló; se reintenta con JSZip.", admErr);
    throw admErr;
  }
}

/** Igual que listZipImages, pero si AdmZip no puede leer el ZIP (p. ej. generado con JSZip) usa JSZip. */
export async function listZipImagesAsync(
  zipBuffer: Buffer,
  options?: { includeBuffers?: boolean },
): Promise<{
  byNormalizedRawCode: Map<string, ZipImageEntry[]>;
  byNumericPrefixCode: Map<string, ZipImageEntry[]>;
  byFileName: Map<string, ZipImageEntry>;
  entries: ZipImageEntry[];
}> {
  const includeBuffers = options?.includeBuffers !== false;
  try {
    return listZipImages(zipBuffer, options);
  } catch {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(zipBuffer);
    const entries: ZipImageEntry[] = [];
    for (const [entryName, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      const buf = includeBuffers ? Buffer.from(await file.async("uint8array")) : Buffer.alloc(0);
      const ent = zipImageEntryFromPath(entryName, buf);
      if (ent) entries.push(ent);
    }
    return indexZipEntries(entries);
  }
}

export function computeOrphanFiles(
  entries: ZipImageEntry[],
  usedFileNames: Set<string>
): string[] {
  const orphans: string[] = [];
  entries.forEach((e) => {
    if (!usedFileNames.has(e.fileName)) orphans.push(e.fileName);
  });
  return orphans.sort((a, b) => a.localeCompare(b));
}
