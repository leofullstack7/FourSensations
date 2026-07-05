"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TechAmbient } from "@/components/ui/TechAmbient";
import {
  CATEGORY_SHOWCASE_AUTO_MS,
  CATEGORY_SHOWCASE_ITEMS,
  CATEGORY_SHOWCASE_MOBILE_PAGE_SIZE,
} from "@/lib/category-showcase";

type CategoryShowcaseStripProps = {
  categoryPath: (name: string) => string;
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

export function CategoryShowcaseStrip({ categoryPath }: CategoryShowcaseStripProps) {
  const isMobile = useIsMobileCarousel();
  const pageCount = Math.ceil(CATEGORY_SHOWCASE_ITEMS.length / CATEGORY_SHOWCASE_MOBILE_PAGE_SIZE);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setPage((p) => (p + 1) % pageCount);
  }, [pageCount]);

  useEffect(() => {
    if (!isMobile || paused) return;
    const id = window.setInterval(advance, CATEGORY_SHOWCASE_AUTO_MS);
    return () => window.clearInterval(id);
  }, [isMobile, paused, advance]);

  const trackStyle = useMemo(() => {
    if (!isMobile) return undefined;
    return { transform: `translate3d(calc(-${page} * 100% / ${pageCount}), 0, 0)` };
  }, [isMobile, page, pageCount]);

  return (
    <section className="categories-strip categories-strip--showcase reveal" aria-labelledby="categories-showcase-title">
      <TechAmbient variant="subtle" />
      <div className="container categories-strip-inner">
        <h2 id="categories-showcase-title" className="categories-showcase-title">
          Categorías
        </h2>

        <div
          className="cat-showcase-viewport"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div
            className={`cat-showcase-track${isMobile ? " cat-showcase-track--mobile" : ""}`}
            style={trackStyle}
            aria-live={isMobile ? "polite" : undefined}
          >
            {CATEGORY_SHOWCASE_ITEMS.map((item, index) => (
              <Link
                key={item.label}
                href={`/categoria/${categoryPath(item.label)}`}
                className={`cat-showcase-card cat-showcase-card--${item.variant}`}
                style={{ "--float-delay": `${item.floatDelay}s` } as React.CSSProperties}
                prefetch
              >
                <span className="cat-showcase-card__glow" aria-hidden />
                <span className="cat-showcase-card__body">
                  <Image
                    src={item.image}
                    alt={item.displayName}
                    width={420}
                    height={520}
                    className="cat-showcase-card__img"
                    sizes="(max-width: 767px) 46vw, 180px"
                    priority={index < 2}
                  />
                  <span className="cat-showcase-card__shade" aria-hidden />
                  <span className="cat-showcase-card__label">{item.displayName.toUpperCase()}</span>
                </span>
              </Link>
            ))}
          </div>

          {isMobile && pageCount > 1 && (
            <div className="cat-showcase-dots" role="tablist" aria-label="Páginas de categorías">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={page === i}
                  aria-label={`Ver categorías ${i * 2 + 1} a ${Math.min((i + 1) * 2, CATEGORY_SHOWCASE_ITEMS.length)}`}
                  className={`cat-showcase-dot${page === i ? " cat-showcase-dot--active" : ""}`}
                  onClick={() => setPage(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
