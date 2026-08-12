import type { CSSProperties } from "react";
import { formatPrice } from "@/lib/format";
import { formatDiscountBadge, resolveProductPrice } from "@/lib/product-discount";
import type { StoreProduct } from "@/lib/types/product";

export function StoreProductPrice({
  product,
  currentStyle,
  showBadge = true,
}: {
  product: Pick<StoreProduct, "price" | "originalPrice" | "discountPercent">;
  currentStyle?: CSSProperties;
  showBadge?: boolean;
}) {
  const resolved = resolveProductPrice(product);
  return (
    <>
      <span className="price-current" style={currentStyle}>
        {formatPrice(resolved.price)}
      </span>
      {resolved.originalPrice != null ? (
        <span className="price-original">{formatPrice(resolved.originalPrice)}</span>
      ) : null}
      {showBadge && resolved.discountPercent != null ? (
        <span className="price-discount">{formatDiscountBadge(resolved.discountPercent)}</span>
      ) : null}
    </>
  );
}

export function StoreDiscountBadge({
  product,
}: {
  product: Pick<StoreProduct, "price" | "originalPrice" | "discountPercent">;
}) {
  const resolved = resolveProductPrice(product);
  if (resolved.discountPercent == null) return null;
  return (
    <span className="product-discount-flag" aria-label={`${resolved.discountPercent}% de descuento`}>
      {formatDiscountBadge(resolved.discountPercent)}
    </span>
  );
}
