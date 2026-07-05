export type CategoryShowcaseVariant = "rosado" | "cafe";

export type CategoryShowcaseItem = {
  /** Nombre de categoría en menú / BD */
  label: string;
  /** Texto en la tarjeta (mayúsculas) */
  displayName: string;
  image: string;
  variant: CategoryShowcaseVariant;
  /** Retraso de animación de levitación (s) */
  floatDelay: number;
};

/** Orden fijo: 3 rosado + 3 café intercalados (como las imágenes en public/categorias). */
export const CATEGORY_SHOWCASE_ITEMS: CategoryShowcaseItem[] = [
  {
    label: "Cuidado capilar",
    displayName: "Capilar",
    image: "/categorias/cuidado-capilar-rosado.webp",
    variant: "rosado",
    floatDelay: 0,
  },
  {
    label: "Cuidado piel",
    displayName: "Cuidado piel",
    image: "/categorias/cuidado-piel-cafe.webp",
    variant: "cafe",
    floatDelay: 0.35,
  },
  {
    label: "Maquillaje",
    displayName: "Maquillaje",
    image: "/categorias/maquillaje-rosado.webp",
    variant: "rosado",
    floatDelay: 0.7,
  },
  {
    label: "Hombres",
    displayName: "Hombres",
    image: "/categorias/hombres-cafe.webp",
    variant: "cafe",
    floatDelay: 1.05,
  },
  {
    label: "Tintes",
    displayName: "Tintes",
    image: "/categorias/tintes-rosado.webp",
    variant: "rosado",
    floatDelay: 1.4,
  },
  {
    label: "Uñas",
    displayName: "Uñas",
    image: "/categorias/unas-cafe.webp",
    variant: "cafe",
    floatDelay: 1.75,
  },
];

export const CATEGORY_SHOWCASE_MOBILE_PAGE_SIZE = 2;
export const CATEGORY_SHOWCASE_AUTO_MS = 5000;
