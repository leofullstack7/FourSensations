"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductModalZoomImage } from "@/components/store/ProductModalZoomImage";
import { StoreDiscountBadge } from "@/components/store/StoreProductPrice";
import { isDisplayableImageUrl } from "@/lib/util/image-url";
import type { StoreProduct } from "@/lib/types/product";

const CAROUSEL_ITEM = 108;
const CAROUSEL_GAP = 12;
const CAROUSEL_STEP = CAROUSEL_ITEM + CAROUSEL_GAP;
const CAROUSEL_SPEED = 22;

export function ProductModalGallery({ product }: { product: StoreProduct }) {
  const urls = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of [product.img, product.imgHover, ...product.gallery]) {
      const url = raw?.trim() ?? "";
      if (!isDisplayableImageUrl(url) || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
    }
    return out;
  }, [product.gallery, product.img, product.imgHover]);

  const [index, setIndex] = useState(0);
  const src = urls[index] ?? null;
  const offsetRef = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  const looped = urls.length > 1 ? [...urls, ...urls] : urls;

  const measureLoopWidth = useCallback(() => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first || urls.length === 0) return urls.length * CAROUSEL_STEP;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || CAROUSEL_GAP;
    return urls.length * (first.getBoundingClientRect().width + gap);
  }, [urls.length]);

  useEffect(() => {
    setIndex(0);
    offsetRef.current = 0;
    if (trackRef.current) {
      trackRef.current.style.transform = "translate3d(0,0,0)";
    }
  }, [product.id, urls.length]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (urls.length < 2) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const loopW = measureLoopWidth();
      if (!pausedRef.current && loopW > 0) {
        offsetRef.current = (offsetRef.current + (CAROUSEL_SPEED * dt) / 1000) % loopW;
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [measureLoopWidth, urls.length]);

  const nudge = useCallback(
    (direction: -1 | 1) => {
      const loopW = measureLoopWidth();
      if (loopW <= 0) return;
      const first = trackRef.current?.firstElementChild as HTMLElement | null;
      const gap = trackRef.current
        ? Number.parseFloat(getComputedStyle(trackRef.current).columnGap || getComputedStyle(trackRef.current).gap) || CAROUSEL_GAP
        : CAROUSEL_GAP;
      const step = (first?.getBoundingClientRect().width ?? CAROUSEL_ITEM) + gap;
      pausedRef.current = true;
      setPaused(true);
      offsetRef.current = (offsetRef.current + direction * step + loopW * 8) % loopW;
      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
      }
      window.setTimeout(() => {
        pausedRef.current = false;
        setPaused(false);
      }, 2800);
    },
    [measureLoopWidth],
  );

  return (
    <div className="modal-gallery modal-gallery--tech">
      <div className="modal-gallery-tech-overlay" aria-hidden />
      <div className="modal-gallery-placeholder" style={{ position: "relative" }}>
        {src ? (
          <div key={`${product.id}-${src}`} className="modal-gallery-slide">
            <div className="modal-gallery-kenburns">
              <ProductModalZoomImage src={src} alt={product.name} />
            </div>
          </div>
        ) : (
          product.emoji
        )}
        <StoreDiscountBadge product={product} />
      </div>
      {urls.length > 1 ? (
        <div
          className="modal-gallery-carousel"
          onMouseEnter={() => {
            pausedRef.current = true;
            setPaused(true);
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
            setPaused(false);
          }}
        >
          <button
            type="button"
            className="modal-gallery-carousel__arrow modal-gallery-carousel__arrow--prev"
            aria-label="Fotos anteriores"
            onClick={() => nudge(-1)}
          >
            ‹
          </button>
          <div className="modal-gallery-carousel__viewport">
            <div ref={trackRef} className="modal-gallery-carousel__track">
              {looped.map((url, i) => {
                const realIndex = i % urls.length;
                return (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    className={`modal-gallery-carousel__item${index === realIndex ? " is-active" : ""}`}
                    onClick={() => setIndex(realIndex)}
                  >
                    <Image
                      src={url}
                      alt=""
                      fill
                      sizes="108px"
                      loading="lazy"
                      unoptimized
                      style={{ objectFit: "cover" }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            className="modal-gallery-carousel__arrow modal-gallery-carousel__arrow--next"
            aria-label="Fotos siguientes"
            onClick={() => nudge(1)}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
