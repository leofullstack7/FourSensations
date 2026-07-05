"use client";

import Image from "next/image";
import type { StoreProduct } from "@/lib/types/product";
import { formatPrice } from "@/lib/format";
import { isHttpImageUrl } from "@/lib/util/image-url";

export function StoreProductCard({
  product,
  isFav,
  onOpen,
  onToggleFav,
  onAddCart,
  imagePriority = false,
}: {
  product: StoreProduct;
  isFav: boolean;
  onOpen: (id: string) => void;
  onToggleFav: (id: string) => void;
  onAddCart: (id: string) => void;
  imagePriority?: boolean;
}) {
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;
  const badgeMap = { new: "badge-new", sale: "badge-sale", hot: "badge-hot", best: "badge-best" } as const;
  const badgeLbl = { new: "Nuevo", sale: "Oferta", hot: "🔥 Hot", best: "⭐ Top" } as const;

  return (
    <div
      className="product-card product-card--tech"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(product.id)}
    >
      <div className="product-card-shine" aria-hidden />
      <div className="product-img-wrap">
        <div className="product-img-placeholder">
          {isHttpImageUrl(product.img) ? (
            <Image
              src={product.img}
              alt=""
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              priority={imagePriority}
              loading={imagePriority ? undefined : "lazy"}
              style={{ objectFit: "cover" }}
            />
          ) : (
            product.emoji
          )}
        </div>
        {product.badge && (
          <div className="product-badges">
            <span className={`badge-tag ${badgeMap[product.badge]}`}>{badgeLbl[product.badge]}</span>
          </div>
        )}
        <div className="product-actions">
          <button
            type="button"
            className={`prod-action-btn ${isFav ? "fav-active" : ""}`}
            data-fav={product.id}
            title={isFav ? "Quitar favorito" : "Agregar favorito"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFav(product.id);
            }}
          >
            {isFav ? "♥" : "♡"}
          </button>
          <button
            type="button"
            className="prod-action-btn"
            title="Ver detalle"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(product.id);
            }}
          >
            👁
          </button>
        </div>
      </div>
      <div className="product-info">
        <div className="product-brand">{product.brand}</div>
        <div className="product-name">{product.name}</div>
        <div className="product-variant">{product.subcategory}</div>
        <div className="product-stars">
          <span className="stars">
            {"★".repeat(Math.floor(product.rating))}
            {"☆".repeat(5 - Math.floor(product.rating))}
          </span>
          <span className="reviews-count">({product.reviews})</span>
        </div>
        <div className="product-price-row">
          <div>
            <span className="price-current">{formatPrice(product.price)}</span>
            {product.originalPrice != null && (
              <span className="price-original">{formatPrice(product.originalPrice)}</span>
            )}
            {discount != null && <span className="price-discount">-{discount}%</span>}
          </div>
          <button
            type="button"
            className="add-to-cart-mini"
            title="Agregar al carrito"
            onClick={(e) => {
              e.stopPropagation();
              onAddCart(product.id);
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
