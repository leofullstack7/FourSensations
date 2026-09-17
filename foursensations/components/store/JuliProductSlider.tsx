"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { StoreProductPrice } from "@/components/store/StoreProductPrice";
import type { StoreProduct } from "@/lib/types/product";
import { isDisplayableImageUrl } from "@/lib/util/image-url";

type JuliProductSliderProps = {
  products: StoreProduct[];
  hints?: Record<string, string>;
  favorites: string[];
  onOpen: (id: string) => void;
  onAddCart: (id: string, product: StoreProduct) => void;
  onToggleFav: (id: string, isFav: boolean) => void;
};

export function JuliProductSlider({
  products,
  hints,
  favorites,
  onOpen,
  onAddCart,
  onToggleFav,
}: JuliProductSliderProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const labelId = useId();
  const total = products.length;

  const syncIndex = useCallback(() => {
    const el = viewportRef.current;
    if (!el || total < 1) return;
    const slides = Array.from(el.querySelectorAll<HTMLElement>(".juli-slide"));
    if (slides.length === 0) return;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < slides.length; i++) {
      const dist = Math.abs(slides[i]!.offsetLeft - el.scrollLeft);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    setIndex(best);
  }, [total]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncIndex, { passive: true });
    return () => el.removeEventListener("scroll", syncIndex);
  }, [syncIndex]);

  const go = (dir: -1 | 1) => {
    const el = viewportRef.current;
    if (!el) return;
    const slides = el.querySelectorAll<HTMLElement>(".juli-slide");
    const next = Math.max(0, Math.min(total - 1, index + dir));
    const target = slides[next];
    if (!target) return;
    el.scrollTo({ left: target.offsetLeft, behavior: "smooth" });
    setIndex(next);
  };

  if (total === 0) return null;

  return (
    <div className="juli-slider" aria-labelledby={labelId}>
      <div className="juli-slider__bar">
        <p id={labelId} className="juli-slider__caption">
          Recomendadas para ti
        </p>
        {total > 1 ? (
          <div className="juli-slider__nav">
            <button
              type="button"
              className="juli-slider__arrow"
              aria-label="Anterior"
              disabled={index <= 0}
              onClick={() => go(-1)}
            >
              ‹
            </button>
            <span className="juli-slider__count">
              {index + 1}/{total}
            </span>
            <button
              type="button"
              className="juli-slider__arrow juli-slider__arrow--next"
              aria-label="Siguiente"
              disabled={index >= total - 1}
              onClick={() => go(1)}
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
      <div ref={viewportRef} className="juli-slider__viewport">
        {products.map((product) => {
          const hint = hints?.[product.id];
          const isFav = favorites.includes(product.id);
          const photo = isDisplayableImageUrl(product.img);
          return (
            <article key={product.id} className="juli-slide">
              <button type="button" className="juli-slide__media" onClick={() => onOpen(product.id)}>
                {photo ? (
                  <Image
                    src={product.img}
                    alt={product.name}
                    fill
                    sizes="108px"
                    className="juli-slide__img"
                    unoptimized={product.img.startsWith("/") || product.img.startsWith("http")}
                  />
                ) : (
                  <span className="juli-slide__emoji" aria-hidden>
                    {product.emoji || "✨"}
                  </span>
                )}
              </button>
              <div className="juli-slide__body">
                <p className="juli-slide__hint">{hint || product.subcategory || product.brand}</p>
                <h3 className="juli-slide__name">
                  <button type="button" onClick={() => onOpen(product.id)}>
                    {product.name}
                  </button>
                </h3>
                <div className="juli-slide__price">
                  <StoreProductPrice product={product} currentStyle={{ fontSize: 12 }} />
                </div>
                <div className="juli-slide__actions">
                  <button
                    type="button"
                    className="juli-slide__btn juli-slide__btn--cart"
                    onClick={() => onAddCart(product.id, product)}
                  >
                    Añadir
                  </button>
                  <button
                    type="button"
                    className={`juli-slide__btn juli-slide__btn--fav${isFav ? " is-active" : ""}`}
                    aria-pressed={isFav}
                    onClick={() => onToggleFav(product.id, isFav)}
                  >
                    {isFav ? "♥" : "♡"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
