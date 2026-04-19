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

/** Misma regla que el carrito lateral (envío gratis desde cierto subtotal). */
export function computeShippingCop(subtotal: number): number {
  return subtotal >= 130_000 ? 0 : 9_000;
}
