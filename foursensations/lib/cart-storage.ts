import type { CartLine, StoreProduct } from "@/lib/types/product";
import { SHIPPING_ZONES, type ShippingZoneId } from "@/lib/checkout/shipping-zones";

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

/** Estimación de envío en carrito según zona de sesión (fallback nacional). */
export function computeShippingCop(_subtotal: number, zoneId: ShippingZoneId = "nacional"): number {
  return SHIPPING_ZONES[zoneId]?.rateSubtotalLow ?? SHIPPING_ZONES.nacional.rateSubtotalLow;
}

/** Actualiza precios e imágenes del carrito con el catálogo vivo. Combos no se tocan. */
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
    const imgSame = (live.img || "") === (line.img || "");
    const hoverSame = (live.imgHover || "") === (line.imgHover || "");
    if (
      live.price === line.price &&
      live.originalPrice === line.originalPrice &&
      nextPct === prevPct &&
      Boolean(live.isWholesalePrice) === Boolean(line.isWholesalePrice) &&
      imgSame &&
      hoverSame
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
      img: live.img,
      imgHover: live.imgHover,
      emoji: live.emoji,
      gallery: live.gallery,
      colorHex: live.colorHex,
      colorName: live.colorName,
      variantGroupCode: live.variantGroupCode,
    };
  });
  return changed ? next : cart;
}
