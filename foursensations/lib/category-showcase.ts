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
    label: "Shampoo y Acondicionador",
    displayName: "Shampoo y Acondicionador",
    image: "/api/media/productos/FS005/FS005-1.webp",
    variant: "cafe",
    floatDelay: 0.15,
  },
  {
    label: "Crecimiento y Fortalecimiento",
    displayName: "Crecimiento y Fortalecimiento",
    image: "/api/media/productos/FS011/FS011-1.webp",
    variant: "rosado",
    floatDelay: 0.3,
  },
  {
    label: "Detox y Cuero Cabelludo",
    displayName: "Detox y Cuero Cabelludo",
    image: "/api/media/productos/FS006/FS006-1.webp",
    variant: "cafe",
    floatDelay: 0.45,
  },
  {
    label: "Finalizadores y Protección",
    displayName: "Finalizadores y Protección",
    image: "/api/media/productos/FS009/FS009-1.webp",
    variant: "rosado",
    floatDelay: 0.6,
  },
  {
    label: "Hair Mist",
    displayName: "Hair Mist",
    image: "/api/media/productos/FS012/FS012-1.webp",
    variant: "cafe",
    floatDelay: 0.75,
  },
  {
    label: "Reparación de Puntas",
    displayName: "Reparación de Puntas",
    image: "/api/media/productos/FS017/FS017-1.webp",
    variant: "rosado",
    floatDelay: 0.9,
  },
  {
    label: "Pre - Shampoo",
    displayName: "Pre - Shampoo",
    image: "/api/media/productos/FS003/FS003-1.webp",
    variant: "cafe",
    floatDelay: 1.05,
  },
];

export const CATEGORY_SHOWCASE_MOBILE_PAGE_SIZE = 2;
export const CATEGORY_SHOWCASE_AUTO_MS = 5000;
