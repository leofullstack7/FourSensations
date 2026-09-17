export type CategoryShowcaseVariant = "rosado" | "cafe";

export type CategoryShowcaseItem = {
  label: string;
  displayName: string;
  image: string;
  variant: CategoryShowcaseVariant;
  floatDelay: number;
};

/** Home: subcategorías de Cuidado capilar. */
export const CATEGORY_SHOWCASE_ITEMS: CategoryShowcaseItem[] = [
  {
    label: "Tratamientos",
    displayName: "Tratamientos",
    image: "/api/media/productos/FS002/FS002-1.webp",
    variant: "rosado",
    floatDelay: 0,
  },
  {
    label: "Rutinas",
    displayName: "Rutinas",
    image: "/api/media/productos/FS005/FS005-1.webp",
    variant: "cafe",
    floatDelay: 0.15,
  },
  {
    label: "Finalizadores",
    displayName: "Finalizadores",
    image: "/api/media/productos/FS009/FS009-1.webp",
    variant: "rosado",
    floatDelay: 0.3,
  },
  {
    label: "Tónicos",
    displayName: "Tónicos",
    image: "/api/media/productos/FS011/FS011-1.webp",
    variant: "cafe",
    floatDelay: 0.45,
  },
  {
    label: "Fragancias",
    displayName: "Fragancias",
    image: "/api/media/productos/FS019/FS019-1.webp",
    variant: "rosado",
    floatDelay: 0.6,
  },
  {
    label: "Multiuso",
    displayName: "Multiuso",
    image: "/api/media/productos/FS016/FS016-1.webp",
    variant: "cafe",
    floatDelay: 0.75,
  },
];

export const CATEGORY_SHOWCASE_MOBILE_PAGE_SIZE = 2;
export const CATEGORY_SHOWCASE_AUTO_MS = 5000;
