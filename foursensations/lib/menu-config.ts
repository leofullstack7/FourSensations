import type { MenuConfig } from "@/lib/types/admin";

/** Categorías públicas al lanzar. */
export const defaultMenuConfig: MenuConfig = {
  "Cuidado capilar": {
    icon: "💇",
    subs: {
      Tratamientos: ["Dulce Renacer", "Sensación Primaveral", "Proteína Capilar"],
      "Shampoo y Acondicionador": [
        "Botanical",
        "Kit Tentación Equilibrio",
        "Kit Tentación Nutrición",
        "Kit Scalp Therapy",
      ],
      "Crecimiento y Fortalecimiento": ["Secreto de Primavera", "Shots Capilares"],
      "Detox y Cuero Cabelludo": ["Scrub Glow", "Kit Scalp Therapy", "Cepillo"],
      "Finalizadores y Protección": ["Fantasía Natural", "Shine Gloss"],
      "Hair Mist": ["Sweet Love", "BloomShine", "Scarlette", "Golden Glow"],
      "Reparación de Puntas": ["Luna Llena", "Suspiros"],
      "Pre - Shampoo": ["Bomba Capilar"],
    },
  },
  "Cuidado Corporal": {
    icon: "🧴",
    subs: {
      Cuerpo: ["Próximamente"],
    },
  },
  Accesorios: {
    icon: "👜",
    subs: { Capilar: ["Diademas", "Gorros", "Cepillos", "Ligas", "Pinzas"] },
  },
  Mayorista: {
    icon: "📦",
    subs: { Programa: ["Registrarme como mayorista"], Paquetes: ["Kit Capilar"] },
  },
};

export function toCategorySlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function getMenuCategoryBySlug(slug: string) {
  return Object.entries(defaultMenuConfig).find(([label]) => toCategorySlug(label) === slug) ?? null;
}

function normalizeCategoryLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const STOREFRONT_NAV_NAMES = new Set(
  Object.keys(defaultMenuConfig).map((name) => normalizeCategoryLabel(name)),
);

const LAUNCH_NAV_ORDER = Object.keys(defaultMenuConfig);

/** Filtra el menú de tienda a las categorías de lanzamiento y completa las que falten en DB. */
export function filterStorefrontLaunchMenu<T extends { config: MenuConfig; slugByCategoryName: Record<string, string> }>(
  payload: T,
): T {
  const config: MenuConfig = {};
  const slugByCategoryName: Record<string, string> = {};

  for (const [name, cfg] of Object.entries(payload.config)) {
    if (!STOREFRONT_NAV_NAMES.has(normalizeCategoryLabel(name))) continue;
    config[name] = cfg;
    if (payload.slugByCategoryName[name]) slugByCategoryName[name] = payload.slugByCategoryName[name];
  }

  for (const name of LAUNCH_NAV_ORDER) {
    const already = Object.keys(config).some((key) => normalizeCategoryLabel(key) === normalizeCategoryLabel(name));
    if (already) continue;
    config[name] = defaultMenuConfig[name]!;
    slugByCategoryName[name] = toCategorySlug(name);
  }

  const ordered: MenuConfig = {};
  const orderedSlugs: Record<string, string> = {};
  for (const launchName of LAUNCH_NAV_ORDER) {
    const match = Object.keys(config).find((key) => normalizeCategoryLabel(key) === normalizeCategoryLabel(launchName));
    if (!match) continue;
    ordered[match] = config[match]!;
    if (slugByCategoryName[match]) orderedSlugs[match] = slugByCategoryName[match]!;
  }

  if (Object.keys(ordered).length === 0) return payload;
  return { ...payload, config: ordered, slugByCategoryName: orderedSlugs };
}

export function getMenuGroupLabelsForStoreCategory(params: { name: string; slug: string }): string[] {
  const slugNorm = params.slug.trim().toLowerCase();
  const nameNorm = normalizeCategoryLabel(params.name);

  const collectKeys = (cfg: (typeof defaultMenuConfig)[string]) => Object.keys(cfg.subs);

  for (const [label, cfg] of Object.entries(defaultMenuConfig)) {
    if (label === params.name) return collectKeys(cfg);
  }
  for (const [label, cfg] of Object.entries(defaultMenuConfig)) {
    if (toCategorySlug(label) === slugNorm) return collectKeys(cfg);
  }
  for (const [label, cfg] of Object.entries(defaultMenuConfig)) {
    if (normalizeCategoryLabel(label) === nameNorm) return collectKeys(cfg);
  }
  return [];
}
