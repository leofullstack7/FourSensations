/** Producto en tienda pública (paridad con main.js / tarjetas). */
export type StoreBadge = "new" | "sale" | "hot" | "best" | null;

export type StoreProduct = {
  id: number;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  tags: string[];
  price: number;
  originalPrice: number | null;
  rating: number;
  reviews: number;
  badge: StoreBadge;
  description: string;
  /** URL principal (CDN); si está vacía, la tienda usa `emoji`. */
  img: string;
  emoji: string;
  isNew: boolean;
  /** Solo orden en home; no se muestra etiqueta al público. */
  featuredInHome: boolean;
  /** URLs adicionales (galería); la principal sigue en `img`. */
  gallery: string[];
};

export type CartLine = StoreProduct & { qty: number };
