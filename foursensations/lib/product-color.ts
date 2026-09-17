/** Normaliza un valor hexadecimal a `#RRGGBB` en mayúsculas, o `null` si no es válido. */
export function normalizeColorHex(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let s = raw.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toUpperCase()}`;
}

/** Parsea celda CSV de color: hex solo, o hex + nombre (`#FF0000 Rojo`, `Rojo|#FF0000`). */
export function parseColorFromCsvCell(raw: string): { hex: string | null; name: string | null } {
  const t = raw.trim();
  if (!t) return { hex: null, name: null };

  const pipeParts = t.split("|").map((p) => p.trim()).filter(Boolean);
  if (pipeParts.length === 2) {
    const hexA = normalizeColorHex(pipeParts[0]);
    const hexB = normalizeColorHex(pipeParts[1]);
    if (hexA && !hexB) return { hex: hexA, name: pipeParts[1] || null };
    if (hexB && !hexA) return { hex: hexB, name: pipeParts[0] || null };
  }

  const hexMatch = t.match(/#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  if (!hexMatch) return { hex: null, name: null };

  const hex = normalizeColorHex(hexMatch[0]);
  if (!hex) return { hex: null, name: null };

  const rest = t
    .replace(hexMatch[0], "")
    .replace(/^[,;|\-\s]+|[,;|\-\s]+$/g, "")
    .trim();

  return { hex, name: rest || null };
}

export function isValidColorHex(raw: string): boolean {
  return normalizeColorHex(raw) !== null;
}

/** Color de texto legible sobre un fondo hex (blanco o negro). */
export function contrastTextOnHex(hex: string): "#000000" | "#FFFFFF" {
  const n = normalizeColorHex(hex);
  if (!n) return "#000000";
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#000000" : "#FFFFFF";
}
