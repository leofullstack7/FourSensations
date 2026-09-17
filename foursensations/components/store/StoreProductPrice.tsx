import type { CSSProperties } from "react";
import { formatPrice } from "@/lib/format";
import {
  formatDiscountBadge,
  resolveProductPrice,
  type ProductDiscountFields,
} from "@/lib/product-discount";

export function StoreProductPrice({
  product,
  currentStyle,
  showBadge = true,
}: {
  product: ProductDiscountFields;
  currentStyle?: CSSProperties;
  showBadge?: boolean;
}) {
  const resolved = resolveProductPrice(product);
  const hasOffer = resolved.originalPrice != null && resolved.discountPercent != null;

  return (
    <div className={`product-price-block${hasOffer ? " product-price-block--offer" : ""}`}>
      <span className="price-current" style={currentStyle}>
        {formatPrice(resolved.price)}
      </span>
      {hasOffer ? (
        <div className="product-price-offer-meta">
          <span className="price-original">{formatPrice(resolved.originalPrice!)}</span>
          {showBadge ? (
            <span className="price-discount">{formatDiscountBadge(resolved.discountPercent!)}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function StoreDiscountBadge({ product }: { product: ProductDiscountFields }) {
  const resolved = resolveProductPrice(product);
  if (resolved.discountPercent == null) return null;
  return (
    <span className="product-discount-flag" aria-label={`${resolved.discountPercent}% de descuento`}>
      {formatDiscountBadge(resolved.discountPercent)}
    </span>
  );
}
