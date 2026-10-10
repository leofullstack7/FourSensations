import { computedDiscountPercent } from "@/lib/product-discount";
import { normalizeMenuLookup } from "@/lib/store/menu-item-href";
import type { StoreProduct } from "@/lib/types/product";

/**
 * Precios mayorista del Catálogo de productos (COP).
 * Clave: nombre comercial normalizado. El público tachado sale del precio vivo de tienda.
 */
const WHOLESALE_PRICE_BY_NAME: Record<string, number> = {
  "dulce renacer": 26_600,
  "sensacion primaveral": 25_200,
  "tentacion equilibrio": 40_600,
  "kit tentacion equilibrio": 40_600,
  "tentacion nutricion": 40_600,
  "kit tentacion nutricion": 40_600,
  "scalp therapy": 40_600,
  "kit scalp therapy": 40_600,
  "scrub glow": 48_300,
  "exfoliante capilar detox": 48_300,
  botanical: 25_900,
  "shampoo botanical": 25_900,
  "cepillo masajeador capilar": 15_400,
  cepillo: 15_400,
  "fantasia natural": 26_600,
  "luna llena": 24_500,
  suspiros: 24_500,
  "secreto de primavera": 35_000,
  "proteina 10 en 1": 29_400,
  "proteina capilar": 29_400,
  "proteina capilar 10 en 1": 29_400,
  "shine gloss": 25_900,
  "brumas capilares": 28_000,
  "perfumes capilares": 28_000,
  "bloom shine": 28_000,
  bloomshine: 28_000,
  "sweet love": 28_000,
  scarlette: 28_000,
  "golden glow": 28_000,
  shots: 48_300,
  "shots capilares": 48_300,
  "shots x3": 48_300,
  "bomba capilar": 51_800,
};

function lookupKey(name: string): string {
  return normalizeMenuLookup(name);
}

export function getWholesaleUnitPrice(productName: string, publicPrice: number): number {
  const key = lookupKey(productName);
  const exact = WHOLESALE_PRICE_BY_NAME[key];
  if (exact && exact > 0 && exact < publicPrice) return exact;

  for (const [alias, price] of Object.entries(WHOLESALE_PRICE_BY_NAME)) {
    if (key.includes(alias) || alias.includes(key)) {
      if (price > 0 && price < publicPrice) return price;
    }
  }

  return Math.max(1, Math.round((publicPrice * 0.7) / 1000) * 1000);
}

export function applyWholesalePricing<T extends StoreProduct>(product: T): T {
  const publicPrice = product.originalPrice && product.originalPrice > product.price ? product.originalPrice : product.price;
  const wholesale = getWholesaleUnitPrice(product.name, publicPrice);
  const sale = Math.min(wholesale, publicPrice);
  return {
    ...product,
    price: sale,
    originalPrice: publicPrice > sale ? publicPrice : null,
    discountPercent: computedDiscountPercent(sale, publicPrice > sale ? publicPrice : null),
    isWholesalePrice: true,
  };
}

export function withWholesalePrices(products: StoreProduct[]): StoreProduct[] {
  return products.map((p) => applyWholesalePricing(p));
}
