/** Tipos públicos de combos promocionales. */

export type StoreComboProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  emoji: string | null;
};

export type StoreComboItem = {
  id: string;
  quantity: number;
  sortOrder: number;
  product: StoreComboProduct;
};

export type StoreCombo = {
  id: string;
  name: string;
  slug: string;
  comboPrice: number;
  /** Suma de precios individuales × cantidades. */
  retailTotal: number;
  items: StoreComboItem[];
};

export function cartComboLineId(comboId: string): string {
  return `combo:${comboId}`;
}

export function parseCartComboId(lineId: string): string | null {
  return lineId.startsWith("combo:") ? lineId.slice("combo:".length) : null;
}
