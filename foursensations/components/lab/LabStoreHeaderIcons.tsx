"use client";

import { useStorefrontUi } from "@/components/store/storefront-ui-context";

/** Iconos del home (SVG) con la misma acción del StorefrontShell. */
export function LabStoreHeaderIcons({ larger = false }: { larger?: boolean }) {
  const { openAccount, openSearch, openWishlist, openCart, favorites, cartCount } = useStorefrontUi();
  const size = larger ? 24 : 20;

  return (
    <div className={`header-icon-group gb-arc-lab__icon-group${larger ? " gb-arc-lab__icon-group--lg" : ""}`}>
      <button type="button" className="icon-btn icon-btn--account" title="Mi cuenta" onClick={openAccount}>
        <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      </button>
      <button type="button" className="icon-btn icon-btn--search" title="Buscar" onClick={openSearch}>
        <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn--fav"
        style={{ position: "relative" }}
        title="Lista de deseos"
        onClick={openWishlist}
      >
        <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <span className="badge fav-badge" style={{ display: favorites.length > 0 ? "flex" : "none" }}>
          {favorites.length}
        </span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn--cart"
        style={{ position: "relative" }}
        title="Carrito"
        onClick={openCart}
      >
        <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
        <span className="badge cart-badge" style={{ display: cartCount > 0 ? "flex" : "none" }}>
          {cartCount}
        </span>
      </button>
    </div>
  );
}
