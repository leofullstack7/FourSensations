import type { MenuConfig } from "@/lib/types/admin";

/** Igual que MENU_CONFIG en main.js — la tienda lo usa hasta leer menú desde API/DB. */
export const defaultMenuConfig: MenuConfig = {
  Accesorios: {
    icon: "👜",
    subs: { Capilar: ["Diademas", "Ligas", "Pinzas", "Peinillas"], Uñas: ["Limas", "Separadores", "Espatulas", "Brochas"], Otros: ["Bolsos", "Estuches", "Espejo de mano"] },
  },
  Mayorista: {
    icon: "📦",
    subs: { Paquetes: ["Kit Maquillaje", "Kit Capilar", "Kit Cuidado Piel"], Volumen: ["Pedidos mínimos 6 uds", "Pedidos mínimos 12 uds"], Exclusivo: ["Registrarme como mayorista"] },
  },
  "Cuidado capilar": {
    icon: "💇",
    subs: { Tratamiento: ["Reparación", "Hidratación", "Crecimiento"], Estilo: ["Finalizadores", "Voluminizadores", "Disciplinadores"], Especiales: ["Cura", "Sin sal", "Para teñido"] },
  },
  "Cuidado piel": {
    icon: "🌿",
    subs: { Rutina: ["Limpiador", "Tónico", "Sérum", "Hidratante"], Tratamiento: ["Manchas", "Acné", "Antienvejecimiento"], Especiales: ["Contorno ojos", "Exfoliante", "Mascarillas"] },
  },
  Maquillaje: {
    icon: "💄",
    subs: { Rostro: ["Base", "Corrector", "Rubor", "Bronzer"], Ojos: ["Sombras", "Delineador", "Máscara", "Cejas"], Labios: ["Labial", "Gloss", "Contorno labios"] },
  },
  Hombres: {
    icon: "🧔",
    subs: { Piel: ["Limpiador facial", "Hidratante", "Contorno ojos"], Barba: ["Aceite de barba", "Bálsamo", "Afeitado"], Kits: ["Kit básico", "Kit premium"] },
  },
  Uñas: {
    icon: "💅",
    subs: { Color: ["Esmaltes", "Gel UV", "Semipermanente"], Cuidado: ["Fortalecedor", "Cuticulas", "Aceites"], Herramientas: ["Limas", "Pulidores", "Kits completos"] },
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

/**
 * Etiquetas de columna del mega menú (texto dorado) para una categoría de tienda.
 * Coincide por nombre de categoría en BD o por slug URL (`Category.slug`).
 * Si la categoría no está en `defaultMenuConfig`, devuelve `[]` (solo entrada manual en admin).
 */
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
