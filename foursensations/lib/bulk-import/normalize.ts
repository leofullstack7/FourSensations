/**
 * Normalización compartida headers y valores (match CSV ↔ nombre archivo ZIP).
 */
export function normalizeKey(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/_/g, " ");
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

/** Igual que normalizeKey pero para comparar headers ya legibles. */
export function normalizeHeaderLabel(input: string): string {
  return normalizeKey(input);
}
