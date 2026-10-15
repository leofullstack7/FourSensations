"use client";

import { useEffect, useState } from "react";
import { STORE_TESTIMONIALS, type StoreTestimonial } from "@/lib/store-testimonials";

function TestimonialCard({ t }: { t: StoreTestimonial }) {
  return (
    <article className="testimonial-card">
      <div className="t-stars" aria-hidden>
        ★★★★★
      </div>
      <p className="t-text">&quot;{t.text}&quot;</p>
      <div className="t-user">
        <div className="t-avatar">{t.initial}</div>
        <div>
          <div className="t-name">{t.name}</div>
          <div className="t-detail">
            {t.city} · {t.tag}
          </div>
        </div>
      </div>
    </article>
  );
}

function cardsPerView(width: number): number {
  if (width >= 1100) return 3;
  if (width >= 720) return 2;
  return 1;
}

export function HomeTestimonials() {
  const [perView, setPerView] = useState(3);
  const [index, setIndex] = useState(0);
  const maxIndex = Math.max(0, STORE_TESTIMONIALS.length - perView);

  useEffect(() => {
    const sync = () => setPerView(cardsPerView(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  const go = (dir: -1 | 1) => {
    setIndex((current) => {
      const next = current + dir;
      if (next < 0) return maxIndex;
      if (next > maxIndex) return 0;
      return next;
    });
  };

  const count = STORE_TESTIMONIALS.length;

  return (
    <section className="testimonials-section section-pad" aria-label="Testimonios de clientas">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-eyebrow">Lo que dicen</div>
          <h2 className="section-title">
            Clientas que nos <em>aman</em>
          </h2>
        </div>

        <div className="testimonials-slider">
          <button type="button" className="testimonials-slider__nav testimonials-slider__nav--prev" onClick={() => go(-1)} aria-label="Testimonios anteriores">
            ‹
          </button>
          <div className="testimonials-slider__viewport">
            <div
              className="testimonials-slider__track"
              style={{
                width: `${(count / perView) * 100}%`,
                transform: `translateX(-${(index * 100) / count}%)`,
              }}
            >
              {STORE_TESTIMONIALS.map((t) => (
                <div
                  key={`${t.name}-${t.city}`}
                  className="testimonials-slider__item"
                  style={{ flex: `0 0 ${100 / count}%` }}
                >
                  <TestimonialCard t={t} />
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="testimonials-slider__nav testimonials-slider__nav--next" onClick={() => go(1)} aria-label="Testimonios siguientes">
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
