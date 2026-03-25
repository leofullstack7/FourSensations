/** URL absoluta http(s) a imagen (p. ej. CDN). */
export function isHttpImageUrl(s: string | null | undefined): boolean {
  if (!s || typeof s !== "string") return false;
  return s.startsWith("https://") || s.startsWith("http://");
}
