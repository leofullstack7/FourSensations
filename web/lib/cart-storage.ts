import { CHECKOUT_FREE_SHIPPING_THRESHOLD_COP } from "@/lib/checkout/shipping-zones";
import type { CartLine } from "@/lib/types/product";

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

/** Misma regla que checkout: envío gratis por encima del umbral. */
export function computeShippingCop(subtotal: number): number {
  return subtotal > CHECKOUT_FREE_SHIPPING_THRESHOLD_COP ? 0 : 9_000;
}
