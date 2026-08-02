import { normalizeKey } from "./normalize";

export function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

/** Heurística: cuenta comas vs punto y coma en la primera línea no vacía. */
export function detectDelimiter(firstLine: string): "," | ";" {
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

export function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && c === delimiter) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

export type ParsedCsv = {
  delimiter: "," | ";";
  headers: string[];
  rows: { values: string[] }[];
};

/**
 * Parse CSV: primera fila = headers. Filas vacías se omiten.
 * Nota: campos multilínea entre comillas no soportados si el salto está partido en líneas físicas.
 */
export function parseCsv(text: string): ParsedCsv {
  const raw = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("CSV vacío");
  }
  const delimiter = detectDelimiter(lines[0]!);
  const headers = parseCsvLine(lines[0]!, delimiter).map((h) => h.trim());
  if (headers.length === 0 || !headers.some((h) => h.length > 0)) {
    throw new Error("CSV sin encabezados válidos");
  }
  const rows: { values: string[] }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]!, delimiter);
    if (values.every((v) => v === "")) continue;
    rows.push({ values });
  }
  return { delimiter, headers, rows };
}

/** Patrones de nombre de columna “código” (orden = prioridad, menor = mejor). */
export const CODE_HEADER_PATTERNS: string[] = [
  "id de la imagen",
  "id de imagen",
  "id imagen",
  "image id",
  "imagen id",
  "nombre imagen",
  "nombre de imagen",
  "nombre archivo",
  "codigo variante",
  "cod variante",
  "codigo de producto",
  "codigo producto",
  "referencia",
  "ref",
  "sku",
  "codigo",
  "cod",
  "id producto",
  "id",
];

export function nameScoreForColumn(normalizedHeader: string): number {
  const h = normalizeKey(normalizedHeader);
  if (h.includes("barras")) return 9999;
  for (let i = 0; i < CODE_HEADER_PATTERNS.length; i++) {
    const p = CODE_HEADER_PATTERNS[i]!;
    if (h === p || h.includes(p)) return i;
  }
  return 999;
}

const CODE_LIKE = /^[A-Za-z0-9._-]+$/;

export function contentScoreForColumn(values: string[], sampleMax = 200): number {
  const sample = values.slice(0, sampleMax).map((v) => v.trim()).filter((v) => v.length > 0);
  if (sample.length === 0) return 0;
  const fillRate = sample.length / Math.min(values.length, sampleMax);
  let numericLike = 0;
  let longPenalty = 0;
  for (const v of sample) {
    if (v.length > 80) longPenalty += 1;
    if (v.length >= 1 && v.length <= 64 && CODE_LIKE.test(v)) numericLike += 1;
  }
  numericLike /= sample.length;
  longPenalty = Math.min(1, longPenalty / sample.length);
  return fillRate * 2 + numericLike * 3 - longPenalty * 2;
}

export function pickCodeColumnIndex(headers: string[], rows: { values: string[] }[]): number {
  const best: { idx: number; score: number; nameIdx: number }[] = [];
  for (let col = 0; col < headers.length; col++) {
    const nameIdx = nameScoreForColumn(headers[col] ?? "");
    const colValues = rows.map((r) => r.values[col] ?? "");
    const cScore = contentScoreForColumn(colValues);
    const combined = (nameIdx < 900 ? 10 - nameIdx / 10 : 0) + cScore;
    best.push({ idx: col, score: combined, nameIdx });
  }
  best.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.nameIdx !== b.nameIdx) return a.nameIdx - b.nameIdx;
    return a.idx - b.idx;
  });
  return best[0]?.idx ?? 0;
}

export type CodeColumnCandidate = { index: number; header: string; score: number };

export function topCodeColumnCandidates(headers: string[], rows: { values: string[] }[], topN = 5): CodeColumnCandidate[] {
  const scored: CodeColumnCandidate[] = [];
  for (let col = 0; col < headers.length; col++) {
    const nameIdx = nameScoreForColumn(headers[col] ?? "");
    const colValues = rows.map((r) => r.values[col] ?? "");
    const cScore = contentScoreForColumn(colValues);
    const combined = (nameIdx < 900 ? 10 - nameIdx / 10 : 0) + cScore;
    scored.push({ index: col, header: headers[col] ?? `Col ${col}`, score: Math.round(combined * 100) / 100 });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
