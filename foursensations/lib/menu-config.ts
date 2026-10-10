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
  for (const name of Object.keys(config)) {
    if (normalizeCategoryLabel(name) !== normalizeCategoryLabel("Cuidado capilar")) continue;
    const current = config[name]!;
    config[name] = { ...current, subs: remapHairMenuSubs(current.subs) };
  }
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
