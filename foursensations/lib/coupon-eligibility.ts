/** Producto con precio tachado / % desc admin: no puede ir en una compra con cupón. */
export function productHasStoreDiscount(p: {
  price: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
}): boolean {
  if (p.discountPercent != null && p.discountPercent > 0) return true;
  if (p.originalPrice != null && p.originalPrice > p.price) return true;
  return false;
}

export function generateWelcomeCouponCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `F${n}${letter}`;
}
