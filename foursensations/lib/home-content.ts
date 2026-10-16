import {
  CATEGORY_SHOWCASE_ITEMS,
  type CategoryShowcaseItem,
} from "@/lib/category-showcase";

/** Claves de widgets horizontales / diagonales del home (img2). */
export const HOME_PROMO_WIDGET_KEYS = [
  "capilar",
  "corporal",
  "accesorios",
  "catalogo",
  "instagram",
  "marca",
] as const;

export type HomePromoWidgetKey = (typeof HOME_PROMO_WIDGET_KEYS)[number];

export type HomePromoWidgets = Partial<Record<HomePromoWidgetKey, string>>;

export type HomeShowcaseImageMap = Record<string, string>;

export type HomeContentSettings = {
  showcaseImages: HomeShowcaseImageMap;
  promoWidgets: HomePromoWidgets;
};

export const HOME_CONTENT_IMAGE_SPECS = [
  {
    id: "showcase",
    title: "Subcategorías Home",
    size: "840 × 1040 px",
    ratio: "vertical 4:5",
    hint: "Foto vertical del producto o textura. Se ve en las cards redondas bajo el hero.",
  },
  {
    id: "promo",
    title: "Widgets de categoría (capilar / corporal / accesorios)",
    size: "1600 × 900 px",
    ratio: "horizontal 16:9",
    hint: "Imagen ancha de fondo. Evita texto en los bordes: encima va el título del widget.",
  },
  {
    id: "diagonal",
    title: "Widgets Catálogo / Instagram / Marca",
    size: "900 × 1200 px",
    ratio: "vertical 3:4",
    hint: "Paneles estrechos del trío diagonal. Centra el sujeto en el medio de la foto.",
  },
  {
    id: "collage",
    title: "Collage de landings de categoría",
    size: "1200 × 1500 px",
    ratio: "vertical 4:5",
    hint: "Tres fotos por categoría (capilar, corporal, accesorios) en el hero de cada landing.",
  },
] as const;

export const HOME_PROMO_WIDGET_LABELS: Record<HomePromoWidgetKey, string> = {
  capilar: "Cuidado capilar",
  corporal: "Cuidado corporal",
  accesorios: "Accesorios capilares",
  catalogo: "Catálogo (trío)",
  instagram: "Instagram (trío)",
  marca: "Marca / Sobre nosotros (trío)",
};

export function normalizeHomeShowcaseImages(raw: unknown): HomeShowcaseImageMap {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: HomeShowcaseImageMap = {};
  for (const item of CATEGORY_SHOWCASE_ITEMS) {
    const v = source[item.label];
    if (typeof v === "string" && v.trim()) out[item.label] = v.trim();
  }
  return out;
}

export function normalizeHomePromoWidgets(raw: unknown): HomePromoWidgets {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: HomePromoWidgets = {};
  for (const key of HOME_PROMO_WIDGET_KEYS) {
    const v = source[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}

export function normalizeHomeContent(raw: unknown): HomeContentSettings {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    showcaseImages: normalizeHomeShowcaseImages(source.showcaseImages ?? source),
    promoWidgets: normalizeHomePromoWidgets(source.promoWidgets ?? source),
  };
}

export function resolveShowcaseItems(overrides?: HomeShowcaseImageMap | null): CategoryShowcaseItem[] {
  return CATEGORY_SHOWCASE_ITEMS.map((item) => ({
    ...item,
    image: overrides?.[item.label]?.trim() || item.image,
  }));
}
