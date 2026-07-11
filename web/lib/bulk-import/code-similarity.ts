/** Umbral mínimo de similitud (0–1) para emparejar código CSV ↔ nombre de imagen.
 *
 * Se usa 0.92 para evitar que imágenes con códigos secuenciales (p. ej. PF019481)
 * se asignen erróneamente al producto del CSV más cercano (PF019480). Con códigos de
 * 8 caracteres, 1 dígito distinto = 87.5 % de similitud, que queda por debajo del
 * umbral y la imagen permanece "sin match". Solo se permiten matches fuzzy cuando los
 * códigos son muy similares (errores tipográficos, ceros de relleno, etc.).
 */
export const FUZZY_CODE_SIMILARITY_MIN = 0.92;

/** Normaliza códigos alfanuméricos para comparación difusa (sin separadores). */
export function normalizeCodeForFuzzyMatch(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^a-z0-9]+/g, "");
  return s;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!;
  }
  return prev[b.length]!;
}

/** Ratio de similitud entre dos códigos (1 = idénticos tras normalizar). */
export function codeSimilarityRatio(a: string, b: string): number {
  const na = normalizeCodeForFuzzyMatch(a);
  const nb = normalizeCodeForFuzzyMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

export function bestFuzzyCodeMatches(
  imageCandidates: string[],
  rows: { rowIndex: number; codeRaw: string | null; normalizedCode: string | null }[],
  minRatio = FUZZY_CODE_SIMILARITY_MIN
): { rowIndex: number; csvCode: string; score: number }[] {
  const scored: { rowIndex: number; csvCode: string; score: number }[] = [];

  for (const row of rows) {
    const csvCandidates = [row.codeRaw, row.normalizedCode].filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );
    if (csvCandidates.length === 0) continue;

    let best = 0;
    for (const imgCode of imageCandidates) {
      if (!imgCode.trim()) continue;
      for (const csvCode of csvCandidates) {
        best = Math.max(best, codeSimilarityRatio(imgCode, csvCode));
      }
    }
    if (best >= minRatio && row.codeRaw) {
      scored.push({ rowIndex: row.rowIndex, csvCode: row.codeRaw, score: best });
    }
  }

  return scored.sort((a, b) => b.score - a.score || a.csvCode.localeCompare(b.csvCode));
}
