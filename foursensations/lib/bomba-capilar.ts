import { getCatalogProductCopy } from "@/lib/catalog-product-copy";
import { normalizeMenuLookup } from "@/lib/store/menu-item-href";
import type { StoreProduct } from "@/lib/types/product";

export const BOMBA_CAPILAR_ID = "virtual:bomba-capilar";

export function isBombaCapilarProduct(productId: string | undefined): boolean {
  return productId === BOMBA_CAPILAR_ID;
}

function findByName(products: StoreProduct[], name: string): StoreProduct | undefined {
  const key = normalizeMenuLookup(name);
  return products.find((p) => {
    const n = normalizeMenuLookup(p.name);
    return n === key || n.includes(key) || key.includes(n);
  });
}

export function findBombaCapilarParts(products: StoreProduct[]): {
  dulce: StoreProduct | undefined;
  primaveral: StoreProduct | undefined;
} {
  return {
    dulce: findByName(products, "Dulce Renacer"),
    primaveral: findByName(products, "Sensación Primaveral"),
  };
}

export function catalogHasBombaCapilar(products: StoreProduct[]): boolean {
  return products.some((p) => p.id !== BOMBA_CAPILAR_ID && normalizeMenuLookup(p.name).includes("bomba capilar"));
}

/** Kit Pre-Shampoo: Dulce Renacer + Sensación Primaveral, hasta que exista SKU propio en admin. */
export function buildBombaCapilarProduct(products: StoreProduct[]): StoreProduct | null {
  if (catalogHasBombaCapilar(products)) return null;
  const { dulce, primaveral } = findBombaCapilarParts(products);
  if (!dulce && !primaveral) return null;
  const copy = getCatalogProductCopy("Bomba Capilar");
  const price = (dulce?.price ?? 0) + (primaveral?.price ?? 0);
  const original =
    (dulce?.originalPrice ?? dulce?.price ?? 0) + (primaveral?.originalPrice ?? primaveral?.price ?? 0);
  return {
    id: BOMBA_CAPILAR_ID,
    slug: "bomba-capilar",
    name: "Bomba Capilar",
    brand: "Four Sensations",
    category: dulce?.category || primaveral?.category || "cuidado-capilar",
    subcategory: "Pre - Shampoo",
    tags: ["pre-shampoo", "kit", "bomba capilar"],
    price: price || 74000,
    originalPrice: original > price ? original : null,
    rating: 5,
    reviews: (dulce?.reviews ?? 0) + (primaveral?.reviews ?? 0),
    badge: "new",
    description:
      copy?.description ||
      "Ritual pre-shampoo: Dulce Renacer + Sensación Primaveral (Repolarizador Capilar) en un mismo gesto intensivo.",
    img: dulce?.img || primaveral?.img || "",
    imgHover: primaveral?.img || dulce?.imgHover || null,
    emoji: "💧",
    isNew: true,
    featuredInHome: false,
    gallery: [dulce?.img, primaveral?.img].filter((url): url is string => Boolean(url && url !== (dulce?.img || primaveral?.img))),
  };
}

export function withBombaCapilarProduct(products: StoreProduct[]): StoreProduct[] {
  const bomba = buildBombaCapilarProduct(products);
  if (!bomba) return products;
  if (products.some((p) => p.id === BOMBA_CAPILAR_ID)) return products;
  return [...products, bomba];
}
