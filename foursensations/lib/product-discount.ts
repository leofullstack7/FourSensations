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
 * Precio público / card:
 * - «precio» (DB) = precio de venta que fijó el admin
 * - «originalPrice» = precio original (tachado si es mayor)
 * - El % del panel Descuentos NO debe recalcular ni pisar ese precio de venta
 * - Solo si no hay par oferta explícito se usa el % gestionado sobre la base
 */
export function resolveProductPrice(p: ProductDiscountFields, now = new Date()): ResolvedProductPrice {
  if (p.isWholesalePrice && p.originalPrice != null && p.originalPrice > p.price) {
    return {
      price: p.price,
      originalPrice: p.originalPrice,
      discountPercent: computedDiscountPercent(p.price, p.originalPrice),
    };
  }

  const original =
    p.originalPrice != null && p.originalPrice > 0 ? Math.round(p.originalPrice) : null;
  const sale = p.price > 0 ? Math.round(p.price) : null;

  // Par del editor (precio + original): siempre gana frente al % gestionado.
  // Caso Pack x4: precio 139900 + original 160000 (no 139200 de un 13% redondeado).
  if (sale != null && original != null && original > sale) {
    return {
      price: sale,
      originalPrice: original,
      discountPercent: computedDiscountPercent(sale, original),
    };
  }

  if (isActiveManagedDiscount(p, now)) {
    const pct = Math.round(p.discountPercent!);
    const base =
      p.discountBasePrice != null && p.discountBasePrice > 0
        ? p.discountBasePrice
        : original != null && original > 0
          ? original
          : sale ?? 0;
    const discounted = computeDiscountedPrice(base, pct);
    return {
      price: discounted,
      originalPrice: base > discounted ? base : null,
      discountPercent: pct,
    };
  }

  // Solo original (+ mayorista): sin precio descuento distinto → portada = original
  if (original != null && (sale == null || sale === original)) {
    return { price: original, originalPrice: null, discountPercent: null };
  }

  // Solo precio descuento / venta
  if (sale != null) {
    return { price: sale, originalPrice: null, discountPercent: null };
  }

  return { price: original ?? 0, originalPrice: null, discountPercent: null };
}

export function formatDiscountBadge(percent: number): string {
  return `${Math.round(percent)}% desc`;
}
