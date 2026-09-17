/** Fila de galería en admin (Bunny u otro CDN de confianza). */
export type AdminProductImage = {
  id: string;
  url: string;
  sortOrder: number;
};

/** Campos marcados como generados por IA. */
export type AiGeneratedFieldsMap = Partial<
  Record<"description" | "tags" | "emoji" | "badge", boolean>
>;

/** Producto en admin — `id` es cuid de Prisma. */
export type AdminProduct = {
  id: string;
  slug: string;
  /** Código / referencia (CSV, importación). */
  externalRef?: string | null;
  /** Código de grupo de variantes (columna CSV «Barras»). */
  variantGroupCode?: string | null;
  /** Orden dentro del grupo (0 = primera variante en CSV). */
  variantGroupOrder?: number | null;
  /** Color en hexadecimal (#RRGGBB). */
  colorHex?: string | null;
  /** Nombre legible del color (opcional). */
  colorName?: string | null;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  tags: string[];
  price: number;
  originalPrice: number | null;
  /** % de descuento de admin (1–90). */
  discountPercent?: number | null;
  /** ISO; null = hasta que se quite. */
  discountEndsAt?: string | null;
  discountBasePrice?: number | null;
  stock: number;
  rating: number;
  reviews: number;
  badge: string | null;
  description: string;
  emoji: string;
  active: boolean;
  isNew: boolean;
  /** Orden prioritario en "Productos Destacados" del home (sin insignia en tienda). */
  featuredInHome: boolean;
  imageUrl: string | null;
  images: AdminProductImage[];
  /** Campos marcados como generados por IA (description, tags, emoji, badge). */
  aiGeneratedFields?: AiGeneratedFieldsMap | null;
};

export type AdminSale = {
  /** `manual-*` o `order-*` (pedido web en base de datos). */
  id: string | number;
  /** Pedidos del checkout vs registro manual en el panel. */
  source?: "manual" | "online";
  /** Referencia del pedido (ej. invoice ePayco) cuando `source === "online"`. */
  orderReference?: string;
  /** Para ordenar ventas recientes (ms). */
  createdAtMs?: number;
  productId: string | null;
  productName: string;
  client: string;
  channel: string;
  qty: number;
  total: number;
  status: string;
  notes: string;
  date: string;
};

export type MenuSubs = Record<string, string[]>;

export type MenuCategory = {
  icon: string;
  subs: MenuSubs;
};

export type MenuConfig = Record<string, MenuCategory>;
