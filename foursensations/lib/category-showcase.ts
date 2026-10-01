export type CategoryShowcaseVariant = "rosado" | "cafe";

export type CategoryShowcaseItem = {
  label: string;
  displayName: string;
  image: string;
  variant: CategoryShowcaseVariant;
  floatDelay: number;
};

/** Home: subcategorías de Cuidado capilar (guía 09). */
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
    floatDelay: 0.1,
  },
  {
    label: "Crecimiento y Fortalecimiento",
    displayName: "Crecimiento y Fortalecimiento",
    image: "/api/media/productos/FS011/FS011-1.webp",
    variant: "rosado",
    floatDelay: 0.2,
  },
  {
    label: "Detox y Cuero Cabelludo",
    displayName: "Detox y Cuero Cabelludo",
    image: "/api/media/productos/FS006/FS006-1.webp",
    variant: "cafe",
    floatDelay: 0.3,
  },
  {
    label: "Finalizadores y Protección",
    displayName: "Finalizadores y Protección",
    image: "/api/media/productos/FS009/FS009-1.webp",
    variant: "rosado",
    floatDelay: 0.4,
  },
  {
    label: "Hair Mist",
    displayName: "Hair Mist",
    image: "/api/media/productos/FS019/FS019-1.webp",
    variant: "cafe",
    floatDelay: 0.5,
  },
  {
    label: "Reparación de Puntas",
    displayName: "Reparación de Puntas",
    image: "/api/media/productos/FS016/FS016-1.webp",
    variant: "rosado",
    floatDelay: 0.6,
  },
  {
    label: "Pre - Shampoo",
    displayName: "Pre - Shampoo",
    image: "/api/media/productos/FS002/FS002-2.webp",
    variant: "cafe",
    floatDelay: 0.7,
  },
];

export const CATEGORY_SHOWCASE_MOBILE_PAGE_SIZE = 3;
export const CATEGORY_SHOWCASE_AUTO_MS = 5200;
