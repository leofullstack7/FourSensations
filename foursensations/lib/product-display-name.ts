/**
 * Normaliza nombres de producto para vitrina:
 * "SERUM LABIAL ROSA" → "Serum Labial Rosa"
 * "serum / labial" → "Serum / Labial"
 */
export function formatProductNameTitleCase(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed
    .toLocaleLowerCase("es")
    .replace(/(^|[\s\-/])(\S)/g, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase("es"));
}
