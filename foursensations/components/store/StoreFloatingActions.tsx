"use client";

import { useCallback, useEffect, useState } from "react";
import { getWhatsAppHref, WHATSAPP_DEFAULT_MESSAGE } from "@/lib/storefront-contact";

const SCROLL_TOP_THRESHOLD = 420;

export function StoreFloatingActions({
  cartCount = 0,
  onOpenCart,
}: {
  cartCount?: number;
  onOpenCart?: () => void;
}) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const whatsappHref = getWhatsAppHref();

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > SCROLL_TOP_THRESHOLD);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const countLabel = cartCount > 99 ? "99+" : String(cartCount);

  return (
    <div className="gb-floating-actions" aria-label="Acciones rápidas">
      <button
        type="button"
        className={`gb-scroll-top${showScrollTop ? " gb-scroll-top--visible" : ""}`}
        onClick={scrollToTop}
        aria-label="Volver arriba"
        title="Volver arriba"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {onOpenCart ? (
        <button
          type="button"
          className={`gb-cart-fab${cartCount > 0 ? " gb-cart-fab--filled" : ""}`}
          onClick={onOpenCart}
          aria-label={cartCount > 0 ? `Abrir carrito (${cartCount} productos)` : "Abrir carrito"}
          title="Mi carrito"
        >
          <span className="gb-cart-fab__ring gb-cart-fab__ring--1" aria-hidden />
          <span className="gb-cart-fab__ring gb-cart-fab__ring--2" aria-hidden />
          <span className="gb-cart-fab__glow" aria-hidden />
          <span className="gb-cart-fab__sparkles" aria-hidden>
            <i /><i /><i />
          </span>
          <span className="gb-cart-fab__icon" aria-hidden>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="20" r="1.4" fill="currentColor" />
              <circle cx="17" cy="20" r="1.4" fill="currentColor" />
            </svg>
          </span>
          <span className="gb-cart-fab__label">Carrito</span>
          {cartCount > 0 ? (
            <span className="gb-cart-fab__badge" aria-hidden>
              {countLabel}
            </span>
          ) : null}
        </button>
      ) : null}

      {whatsappHref ? (
        <a
          href={whatsappHref}
          className="gb-whatsapp-fab"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Escríbenos por WhatsApp: ${WHATSAPP_DEFAULT_MESSAGE}`}
          title="WhatsApp Four Sensations"
        >
          <span className="gb-whatsapp-fab__ring gb-whatsapp-fab__ring--1" aria-hidden />
          <span className="gb-whatsapp-fab__ring gb-whatsapp-fab__ring--2" aria-hidden />
          <span className="gb-whatsapp-fab__glow" aria-hidden />
          <span className="gb-whatsapp-fab__icon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </span>
          <span className="gb-whatsapp-fab__label">WhatsApp</span>
        </a>
      ) : null}
    </div>
  );
}
