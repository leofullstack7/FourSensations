"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { TechAmbient } from "@/components/ui/TechAmbient";
import {
  CATEGORY_SHOWCASE_AUTO_MS,
  CATEGORY_SHOWCASE_ITEMS,
  CATEGORY_SHOWCASE_MOBILE_PAGE_SIZE,
} from "@/lib/category-showcase";

type CategoryShowcaseStripProps = {
  onSelectSubcategory: (subcategory: string) => void;
  activeSubcategory?: string | null;
};

function useIsMobileCarousel(maxWidth = 767) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [maxWidth]);

  return isMobile;
}

export function CategoryShowcaseStrip({ onSelectSubcategory, activeSubcategory }: CategoryShowcaseStripProps) {
  const isMobile = useIsMobileCarousel();
  const pageCount = Math.ceil(CATEGORY_SHOWCASE_ITEMS.length / CATEGORY_SHOWCASE_MOBILE_PAGE_SIZE);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollLock = useRef(false);

  const scrollToPage = useCallback((next: number, behavior: ScrollBehavior = "smooth") => {
    const el = viewportRef.current;
    if (!el) return;
    const clamped = ((next % pageCount) + pageCount) % pageCount;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = pageCount <= 1 ? 0 : (clamped / (pageCount - 1)) * maxScroll;
    scrollLock.current = true;
    el.scrollTo({ left: target, behavior });
    setPage(clamped);
    window.setTimeout(() => {
      scrollLock.current = false;
    }, behavior === "smooth" ? 450 : 0);
  }, [pageCount]);

  const advance = useCallback(() => {
    scrollToPage(page + 1);
  }, [page, scrollToPage]);

  useEffect(() => {
    if (!isMobile || paused) return;
    const id = window.setInterval(advance, CATEGORY_SHOWCASE_AUTO_MS);
    return () => window.clearInterval(id);
  }, [isMobile, paused, advance]);

  useEffect(() => {
    if (!isMobile) {
      setPage(0);
      const el = viewportRef.current;
      if (el) el.scrollLeft = 0;
    }
  }, [isMobile]);

  const onScroll = useCallback(() => {
    if (!isMobile || scrollLock.current) return;
    const el = viewportRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    if (maxScroll <= 0) {
      setPage(0);
      return;
    }
    const next = Math.round((el.scrollLeft / maxScroll) * (pageCount - 1));
    setPage(Math.max(0, Math.min(pageCount - 1, next)));
  }, [isMobile, pageCount]);

  return (
    <section className="categories-strip categories-strip--showcase reveal" aria-labelledby="categories-showcase-title">
      <TechAmbient variant="subtle" />
      <div className="container categories-strip-inner">
        <h2 id="categories-showcase-title" className="categories-showcase-title">
          Subcategorías
        </h2>

        <div
          className={`cat-showcase-viewport${isMobile ? " cat-showcase-viewport--mobile" : ""}`}
          ref={viewportRef}
          onScroll={onScroll}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div
            className={`cat-showcase-track${isMobile ? " cat-showcase-track--mobile" : " cat-showcase-track--desktop"}`}
            aria-live={isMobile ? "polite" : undefined}
          >
            {CATEGORY_SHOWCASE_ITEMS.map((item, index) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={activeSubcategory === item.label}
                aria-label={`Ver productos de ${item.displayName}`}
                className={`cat-showcase-card cat-showcase-card--${item.variant}${activeSubcategory === item.label ? " is-active" : ""}`}
                style={{ "--float-delay": `${item.floatDelay}s` } as React.CSSProperties}
                onClick={() => onSelectSubcategory(item.label)}
              >
                <span className="cat-showcase-card__glow" aria-hidden />
                <span className="cat-showcase-card__body">
                  <Image
                    src={item.image}
                    alt={item.displayName}
                    width={420}
                    height={520}
                    className="cat-showcase-card__img"
                    sizes="(max-width: 767px) 33vw, 12vw"
                    priority={index < 3}
                    unoptimized={item.image.startsWith("/api/")}
                  />
                  <span className="cat-showcase-card__shade" aria-hidden />
                  <span className="cat-showcase-card__label">{item.displayName.toUpperCase()}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {isMobile && pageCount > 1 && (
          <div className="cat-showcase-dots" role="tablist" aria-label="Páginas de subcategorías">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={page === i}
                aria-label={`Ver grupo ${i + 1} de subcategorías`}
                className={`cat-showcase-dot${page === i ? " cat-showcase-dot--active" : ""}`}
                onClick={() => scrollToPage(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
