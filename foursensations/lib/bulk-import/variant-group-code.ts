import { normalizeKey } from "./normalize";

/**
 * Clave canónica para `variantGroupCode` (columna CSV «Barras»).
 * Quita espacios en códigos numéricos (EAN/UPC) para evitar grupos rotos.
 */
export function canonicalVariantGroupCode(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const digitsOnly = t.replace(/\s+/g, "");
  if (/^\d{4,}$/.test(digitsOnly)) return digitsOnly;
  return normalizeKey(t);
}

export function variantGroupCodesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const ca = canonicalVariantGroupCode(a);
  const cb = canonicalVariantGroupCode(b);
  return ca != null && cb != null && ca === cb;
}

/** Clave canónica para `externalRef` (columna código del CSV). */
export function canonicalExternalRef(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  return normalizeKey(t);
}
