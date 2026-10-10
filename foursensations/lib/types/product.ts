/** Producto en tienda pública (paridad con main.js / tarjetas). */
export type StoreBadge = "new" | "sale" | "hot" | "best" | null;

export type StoreProduct = {
  /** Cuid/UUID en DB; string en mocks. Nunca derivar de un hash (colisiona). */
  id: string;
  /** Slug de ficha pública `/producto/[slug]`. */
  slug?: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  tags: string[];
  price: number;
  originalPrice: number | null;
  /** Entero 1–90 para badge «15% desc»; null si no hay oferta real. */
  discountPercent?: number | null;
  rating: number;
  reviews: number;
  badge: StoreBadge;
  description: string;
  /** URL principal (CDN); si está vacía, la tienda usa `emoji`. */
  img: string;
  /** Segunda foto de portada (hover en tarjetas del home). */
  imgHover?: string | null;
  emoji: string;
  isNew: boolean;
  /** Solo orden en home; no se muestra etiqueta al público. */
  featuredInHome: boolean;
  /** URLs adicionales (galería); la principal sigue en `img`. */
  gallery: string[];
  /** Catálogo tintes (opcional; mejora matching del asesor IA). */
  tintLevel?: string;
  tintGroup?: string;
  tintFamily?: string;
  tintType?: string;
  /** Código de grupo de variantes (misma columna Barras del CSV). */
  variantGroupCode?: string | null;
  /** Orden dentro del grupo (0 = variante principal en listados). */
  variantGroupOrder?: number | null;
  /** Solo en tarjetas colapsadas: cuántas variantes tiene el grupo. */
  variantCount?: number;
  /** Color en hexadecimal (#RRGGBB). */
  colorHex?: string | null;
  /** Nombre legible del color (opcional). */
  colorName?: string | null;
  /** Precio de vitrina mayorista (tachado = público). */
  isWholesalePrice?: boolean;
};

export type CartComboItemPreview = {
  name: string;
  quantity: number;
  img?: string;
  emoji?: string;
};

export type CartLine = StoreProduct & {
  qty: number;
  /** Si está presente, la línea representa un combo promocional (precio = comboPrice). */
  comboId?: string;
  comboItems?: CartComboItemPreview[];
};
