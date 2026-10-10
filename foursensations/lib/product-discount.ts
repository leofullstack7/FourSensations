/** Precio efectivo y badge de descuento (tienda + checkout). Sin Prisma. */

export const DISCOUNT_PERCENT_MIN = 1;
export const DISCOUNT_PERCENT_MAX = 90;

export type ProductDiscountFields = {
  price: number;
  originalPrice: number | null;
  discountPercent?: number | null;
  discountEndsAt?: Date | string | null;
  discountBasePrice?: number | null;
  isWholesalePrice?: boolean;
};

export type ResolvedProductPrice = {
  /** Precio de venta a mostrar / cobrar. */
  price: number;
  /** Precio tachado; solo si hay descuento real. */
  originalPrice: number | null;
  /** Entero 1–90 para badge «15% desc»; null si no hay oferta. */
  discountPercent: number | null;
};

function parseEndsAt(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeDiscountedPrice(basePrice: number, percent: number): number {
  const base = Math.max(1, Math.round(basePrice));
  const pct = Math.min(DISCOUNT_PERCENT_MAX, Math.max(DISCOUNT_PERCENT_MIN, Math.round(percent)));
  return Math.max(1, Math.round((base * (100 - pct)) / 100));
}

export function isActiveManagedDiscount(
  p: Pick<ProductDiscountFields, "discountPercent" | "discountEndsAt">,
  now = new Date(),
): boolean {
  const pct = p.discountPercent;
  if (pct == null || pct < DISCOUNT_PERCENT_MIN || pct > DISCOUNT_PERCENT_MAX) return false;
  const ends = parseEndsAt(p.discountEndsAt);
  if (ends && ends.getTime() <= now.getTime()) return false;
  return true;
}

/** Solo tachar si el “antes” es mayor y el % es al menos 1. */
export function computedDiscountPercent(price: number, originalPrice: number | null): number | null {
  if (originalPrice == null || originalPrice <= price || price <= 0) return null;
  const pct = Math.round((1 - price / originalPrice) * 100);
  return pct >= DISCOUNT_PERCENT_MIN ? pct : null;
}

/**
 * Precio público: solo muestra oferta si hay descuento gestionado en admin
 * (`discountPercent` activo, con o sin fecha de fin).
 * No inventa % a partir de `originalPrice` (datos viejos/importados pueden
 * tener un “antes” basura y pintar descuentos falsos del 90%+).
 */
export function resolveProductPrice(p: ProductDiscountFields, now = new Date()): ResolvedProductPrice {
  if (p.isWholesalePrice && p.originalPrice != null && p.originalPrice > p.price) {
    return {
      price: p.price,
      originalPrice: p.originalPrice,
      discountPercent: computedDiscountPercent(p.price, p.originalPrice),
    };
  }
  if (isActiveManagedDiscount(p, now)) {
    const pct = Math.round(p.discountPercent!);
    const base =
      p.discountBasePrice != null && p.discountBasePrice > 0
        ? p.discountBasePrice
        : p.originalPrice != null && p.originalPrice > 0
          ? p.originalPrice
          : p.price;
    const discounted = computeDiscountedPrice(base, pct);
    return {
      price: discounted,
      originalPrice: base > discounted ? base : null,
      discountPercent: pct,
    };
  }

  return { price: p.price, originalPrice: null, discountPercent: null };
}

export function formatDiscountBadge(percent: number): string {
  return `${Math.round(percent)}% desc`;
}
