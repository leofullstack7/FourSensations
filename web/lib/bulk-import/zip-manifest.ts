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
  const upper = baseName.trim().toUpperCase();
  if (!upper) return "";

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

/**
 * Lista imágenes del ZIP y agrupa por clave normalizada (basename).
 */
export function listZipImages(zipBuffer: Buffer): {
  byNormalizedRawCode: Map<string, ZipImageEntry[]>;
  byNumericPrefixCode: Map<string, ZipImageEntry[]>;
  byFileName: Map<string, ZipImageEntry>;
  entries: ZipImageEntry[];
} {
  const zip = new AdmZip(zipBuffer);
  const entries: ZipImageEntry[] = [];
  for (const e of zip.getEntries()) {
    if (e.isDirectory) continue;
    const entryName = e.entryName.replace(/\\/g, "/");
    if (isIgnoredPath(entryName)) continue;
    const ext = path.extname(entryName).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    const buf = e.getData();
    const fileName = path.basename(entryName);
    const base = path.basename(entryName, ext);
    const rawImageCode = toRawImageCode(base);
    const numericPrefixCode = toNumericPrefixCode(rawImageCode);
    const normalizedRawCode = normalizeKey(rawImageCode);
    const normalizedNumericPrefixCode = numericPrefixCode ? normalizeKey(numericPrefixCode) : null;
    entries.push({
      entryName,
      fileName,
      baseName: base,
      rawImageCode,
      numericPrefixCode,
      normalizedRawCode,
      normalizedNumericPrefixCode,
      buffer: buf,
    });
  }
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
