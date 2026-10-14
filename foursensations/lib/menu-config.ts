import {
  HAIR_SUBCATEGORY_ORDER,
  HAIR_SUBCATEGORY_PRODUCTS,
  hairSubcategoryForProductName,
} from "@/lib/hair-subcategories";
import type { MenuConfig } from "@/lib/types/admin";

function hairMenuSubs(): Record<string, string[]> {
  return Object.fromEntries(
    HAIR_SUBCATEGORY_ORDER.map((title) => [title, [...HAIR_SUBCATEGORY_PRODUCTS[title]]]),
  );
}

/** Reagrupa ítems de DB bajo las columnas reales de Cuidado capilar. */
export function remapHairMenuSubs(existing: Record<string, string[]> | undefined): Record<string, string[]> {
  const grouped = hairMenuSubs();
  const seen = new Set(
    Object.values(grouped)
      .flat()
      .map((name) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()),
  );

  for (const name of Object.values(existing ?? {}).flat()) {
    const dest = hairSubcategoryForProductName(name);
    if (!dest) continue;
    const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    grouped[dest].push(name);
  }

  return grouped;
}

/** Categorías públicas al lanzar. */
export const defaultMenuConfig: MenuConfig = {
  "Cuidado capilar": {
    icon: "💇",
    subs: hairMenuSubs(),
  },
  "Cuidado Corporal": {
    icon: "🧴",
    /** Sin productos por ahora: la página y el menú ya existen; el catálogo se llenará después. */
    subs: {
      Corporal: [],
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

/** Filtra el menú de tienda a las categorías de lanzamiento (orden canónico). */
export function filterStorefrontLaunchMenu<T extends { config: MenuConfig; slugByCategoryName: Record<string, string> }>(
  payload: T,
): T {
  const byNorm = new Map<string, { name: string; cfg: MenuConfig[string]; slug?: string }>();
  for (const [name, cfg] of Object.entries(payload.config)) {
    const norm = normalizeCategoryLabel(name);
    if (!STOREFRONT_NAV_NAMES.has(norm)) continue;
    byNorm.set(norm, {
      name,
      cfg,
      slug: payload.slugByCategoryName[name],
    });
  }

  // Asegura que existan todas las categorías de lanzamiento (p. ej. Cuidado Corporal aunque falte en DB).
  for (const [name, cfg] of Object.entries(defaultMenuConfig)) {
    const norm = normalizeCategoryLabel(name);
    if (byNorm.has(norm)) continue;
    byNorm.set(norm, { name, cfg, slug: toCategorySlug(name) });
  }

  const config: MenuConfig = {};
  const slugByCategoryName: Record<string, string> = {};
  for (const [canonicalName, defaultCfg] of Object.entries(defaultMenuConfig)) {
    const norm = normalizeCategoryLabel(canonicalName);
    const hit = byNorm.get(norm);
    if (!hit) continue;
    const isCorporal = norm === normalizeCategoryLabel("Cuidado Corporal");
    const isHair = norm === normalizeCategoryLabel("Cuidado capilar");
    config[canonicalName] = {
      icon: hit.cfg.icon || defaultCfg.icon,
      subs: isCorporal
        ? defaultCfg.subs
        : isHair
          ? remapHairMenuSubs(hit.cfg.subs)
          : hit.cfg.subs,
    };
    slugByCategoryName[canonicalName] =
      hit.slug || payload.slugByCategoryName[hit.name] || toCategorySlug(canonicalName);
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
