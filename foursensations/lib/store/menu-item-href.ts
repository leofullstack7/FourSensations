export function normalizeMenuLookup(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function productPagePath(slug: string): string {
  return `/producto/${slug}`;
}

export const WHOLESALE_HREF = "/mayorista";

export function isWholesaleCategorySlug(slug: string): boolean {
  return slug === "mayorista";
}

/** Landing pública de una categoría del menú. Mayorista siempre va a /mayorista. */
export function resolveStoreCategoryHref(categorySlug: string): string {
  if (isWholesaleCategorySlug(categorySlug)) return WHOLESALE_HREF;
  return `/categoria/${categorySlug}`;
}

/** Enlaces del mega menú: el ítem es un producto cuando hay slug; si no, filtra la categoría por subcategoría (grupo). */
export function resolveStoreMenuItemHref(opts: {
  categorySlug: string;
  group: string;
  item: string;
  productSlugByName: Record<string, string>;
}): string {
  const key = normalizeMenuLookup(opts.item);
  if (key.includes("registrarme")) return WHOLESALE_HREF;
  const slug = opts.productSlugByName[key];
  if (slug) return productPagePath(slug);
  if (isWholesaleCategorySlug(opts.categorySlug)) return WHOLESALE_HREF;
  const params = new URLSearchParams();
  if (opts.group) params.set("grupo", opts.group);
  const qs = params.toString();
  return qs ? `/categoria/${opts.categorySlug}?${qs}` : `/categoria/${opts.categorySlug}`;
}

export function resolveStoreMenuGroupHref(categorySlug: string, group: string): string {
  if (isWholesaleCategorySlug(categorySlug)) return WHOLESALE_HREF;
  return `/categoria/${categorySlug}?grupo=${encodeURIComponent(group)}`;
}
