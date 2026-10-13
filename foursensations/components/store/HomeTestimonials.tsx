"use client";

import { useEffect, useState } from "react";
import { STORE_TESTIMONIALS, type StoreTestimonial } from "@/lib/store-testimonials";

const ROTATE_MS = 4000;
const FADE_MS = 380;

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

export function HomeTestimonials() {
  const total = STORE_TESTIMONIALS.length;
  const [offset, setOffset] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (total < 3) return;
    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setOffset((o) => (o + 3) % total);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [total]);

  const desktopTrio = [0, 1, 2].map((i) => STORE_TESTIMONIALS[(offset + i) % total]!);

  return (
    <section className="testimonials-section section-pad" aria-label="Testimonios de clientas">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-eyebrow">Lo que dicen</div>
          <h2 className="section-title">
            Clientas que nos <em>aman</em>
          </h2>
        </div>

        <div
          className={`testimonials-grid testimonials-grid--desktop reveal-stagger${visible ? " is-in" : " is-out"}`}
          aria-live="polite"
        >
          {desktopTrio.map((t) => (
            <TestimonialCard key={`desk-${t.name}-${t.city}-${offset}`} t={t} />
          ))}
        </div>

        <div className="testimonials-slider-mobile" role="region" aria-label="Carrusel de testimonios">
          <div className="testimonials-slider-track">
            {STORE_TESTIMONIALS.map((t) => (
              <div key={`mob-${t.name}-${t.city}`} className="testimonials-slider-item">
                <TestimonialCard t={t} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
