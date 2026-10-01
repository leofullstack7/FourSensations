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
  "Cuidado corporal": {
    icon: "🧴",
    subs: {
      Corporal: ["Explosión de Chocolate", "Exfoliante Corporal"],
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

/** Filtra el menú de tienda a las categorías de lanzamiento. */
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
  if (Object.keys(config).length === 0) return payload;
  return { ...payload, config, slugByCategoryName };
}

export function getMenuGroupLabelsForStoreCategory(params: { name: string; slug: string }): string[] {
  const slugNorm = params.slug.trim().toLowerCase();
  const nameNorm = normalizeCategoryLabel(params.name);

  const collectKeys = (cfg: (typeof defaultMenuConfig)[string]) =>
    Object.keys(cfg.subs).sort((a, b) => a.localeCompare(b, "es"));

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
