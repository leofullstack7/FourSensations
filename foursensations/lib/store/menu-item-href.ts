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

/** Enlaces del mega menú: el ítem es un producto cuando hay slug; si no, filtra la categoría por subcategoría (grupo). */
export function resolveStoreMenuItemHref(opts: {
  categorySlug: string;
  group: string;
  item: string;
  productSlugByName: Record<string, string>;
}): string {
  const key = normalizeMenuLookup(opts.item);
  if (key.includes("registrarme")) return "/mayorista";
  const slug = opts.productSlugByName[key];
  if (slug) return productPagePath(slug);
  const params = new URLSearchParams();
  if (opts.group) params.set("grupo", opts.group);
  const qs = params.toString();
  return qs ? `/categoria/${opts.categorySlug}?${qs}` : `/categoria/${opts.categorySlug}`;
}

export function resolveStoreMenuGroupHref(categorySlug: string, group: string): string {
  return `/categoria/${categorySlug}?grupo=${encodeURIComponent(group)}`;
}
