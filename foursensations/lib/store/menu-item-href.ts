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

export function resolveStoreCategoryHref(categorySlug: string): string {
  if (normalizeMenuLookup(categorySlug).includes("mayorista")) return "/mayorista";
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
  if (key.includes("registrarme")) return "/mayorista";
  const slug = opts.productSlugByName[key];
  if (slug) return productPagePath(slug);
  const params = new URLSearchParams();
  if (opts.group) params.set("grupo", opts.group);
  const qs = params.toString();
  if (normalizeMenuLookup(opts.categorySlug).includes("mayorista")) return "/mayorista";
  return qs ? `/categoria/${opts.categorySlug}?${qs}` : `/categoria/${opts.categorySlug}`;
}

export function resolveStoreMenuGroupHref(categorySlug: string, group: string): string {
  const slugKey = normalizeMenuLookup(categorySlug);
  if (slugKey.includes("mayorista")) return "/mayorista";
  /** Accesorios filtra por tipo (`linea`), no por familia capilar. */
  if (slugKey === "accesorios") {
    return `/categoria/${categorySlug}?linea=${encodeURIComponent(group)}`;
  }
  return `/categoria/${categorySlug}?grupo=${encodeURIComponent(group)}`;
}

/** Ruta pública de categoría (o mayorista si el slug/nombre lo indica). */
export function resolveStoreCategoryHref(categorySlugOrName: string): string {
  const key = normalizeMenuLookup(categorySlugOrName);
  if (key === "mayorista" || key.includes("mayorista")) return "/mayorista";
  const slug = categorySlugOrName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
  return `/categoria/${slug || categorySlugOrName}`;
}
