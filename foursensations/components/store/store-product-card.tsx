"use client";

import Image from "next/image";
import type { StoreProduct } from "@/lib/types/product";
import { isDisplayableImageUrl } from "@/lib/util/image-url";
import { normalizeColorHex } from "@/lib/product-color";
import { StoreDiscountBadge, StoreProductPrice } from "@/components/store/StoreProductPrice";
import { getProductDisplayName } from "@/lib/product-display-names";

export function StoreProductCard({
  product,
  isFav,
  onOpen,
  onToggleFav,
  onAddCart,
  imagePriority = false,
  compact = false,
}: {
  product: StoreProduct;
  isFav: boolean;
  onOpen: (id: string) => void;
  onToggleFav: (id: string) => void;
  onAddCart: (id: string, product?: StoreProduct) => void;
  imagePriority?: boolean;
  compact?: boolean;
}) {
  const badgeMap = { new: "badge-new", sale: "badge-sale", hot: "badge-hot", best: "badge-best" } as const;
  const badgeLbl = { new: "Nuevo", sale: "Oferta", hot: "🔥 Hot", best: "⭐ Top" } as const;
  const variantColors =
    product.variantColors && product.variantColors.length > 0
      ? product.variantColors
      : (() => {
          const hex = normalizeColorHex(product.colorHex);
          return hex ? [{ hex, name: product.colorName?.trim() || null }] : [];
        })();
  const displayName = getProductDisplayName(product.name);
  const hasMain = isDisplayableImageUrl(product.img);
  const hoverSrc =
    product.imgHover &&
    product.imgHover !== product.img &&
    isDisplayableImageUrl(product.imgHover)
      ? product.imgHover
      : null;

  return (
    <div
      className={`product-card product-card--tech${compact ? " product-card--compact" : ""}${hoverSrc ? " product-card--has-hover-img" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(product.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(product.id)}
    >
      <div className="product-card-shine" aria-hidden />
      <div className="product-img-wrap">
        <div className="product-img-placeholder">
          {hasMain ? (
            <>
              <Image
                src={product.img}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                priority={imagePriority}
                loading={imagePriority ? undefined : "lazy"}
                unoptimized={product.img.startsWith("/")}
                className="product-img product-img--main"
                style={{ objectFit: "cover" }}
              />
              {hoverSrc ? (
                <Image
                  src={hoverSrc}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
                  loading="lazy"
                  unoptimized={hoverSrc.startsWith("/")}
                  className="product-img product-img--hover"
                  style={{ objectFit: "cover" }}
                />
              ) : null}
            </>
          ) : (
            product.emoji
          )}
        </div>
        <div className="product-badges">
          <StoreDiscountBadge product={product} />
          {product.badge ? (
            <span className={`badge-tag ${badgeMap[product.badge]}`}>{badgeLbl[product.badge]}</span>
          ) : null}
        </div>
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
        <div className="product-name">{displayName.title}</div>
        {displayName.subtitle ? <div className="product-subtitle">{displayName.subtitle}</div> : null}
        {variantColors.length > 0 ? (
          <div
            className="product-card-color"
            style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 4, flexWrap: "wrap" }}
            aria-label={
              variantColors.length > 1
                ? `${variantColors.length} colores disponibles`
                : variantColors[0]?.name || "Color"
            }
          >
            {variantColors.map((c) => (
              <span
                key={c.hex}
                title={c.name || undefined}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  backgroundColor: c.hex,
                  border: "2px solid white",
                  boxShadow: "0 0 0 1px var(--line)",
                  flexShrink: 0,
                }}
                aria-hidden
              />
            ))}
            {variantColors.length === 1 && variantColors[0]?.name ? (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{variantColors[0].name}</span>
            ) : null}
          </div>
        ) : null}
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
            <StoreProductPrice product={product} />
          </div>
          <button
            type="button"
            className="add-to-cart-mini"
            title="Agregar al carrito"
            onClick={(e) => {
              e.stopPropagation();
              onAddCart(product.id, product);
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
