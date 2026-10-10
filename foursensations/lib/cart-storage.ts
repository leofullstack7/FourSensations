import type { CartLine, StoreProduct } from "@/lib/types/product";

export const CART_KEY = "gb_cart";

export function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((line) => ({ ...line, id: String(line.id) }));
  } catch {
    return [];
  }
}

export function saveCart(cart: CartLine[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/** Estimación de envío en carrito (tarifa nacional Envía; el checkout usa zona y cobertura). */
export function computeShippingCop(_subtotal: number): number {
  return 15_900;
}

/** Actualiza precios del carrito con el catálogo vivo (descuentos). Combos no se tocan. */
export function syncCartPricesFromCatalog(cart: CartLine[], catalog: StoreProduct[]): CartLine[] {
  if (catalog.length === 0 || cart.length === 0) return cart;
  const byId = new Map(catalog.map((p) => [p.id, p]));
  let changed = false;
  const next = cart.map((line) => {
    if (line.comboId) return line;
    const live = byId.get(line.id);
    if (!live) return line;
    const nextPct = live.discountPercent ?? null;
    const prevPct = line.discountPercent ?? null;
    if (
      live.price === line.price &&
      live.originalPrice === line.originalPrice &&
      nextPct === prevPct &&
      Boolean(live.isWholesalePrice) === Boolean(line.isWholesalePrice)
    ) {
      return line;
    }
    changed = true;
    return {
      ...line,
      price: live.price,
      originalPrice: live.originalPrice,
      discountPercent: nextPct,
      isWholesalePrice: live.isWholesalePrice,
    };
  });
  return changed ? next : cart;
}
