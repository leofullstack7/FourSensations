"use client";

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

export function HomeTestimonials() {
  return (
    <section className="testimonials-section section-pad" aria-label="Testimonios de clientas">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-eyebrow">Lo que dicen</div>
          <h2 className="section-title">
            Clientas que nos <em>aman</em>
          </h2>
        </div>

        <div className="testimonials-grid testimonials-grid--desktop reveal-stagger is-in" aria-live="polite">
          {STORE_TESTIMONIALS.map((t) => (
            <TestimonialCard key={`desk-${t.name}-${t.city}`} t={t} />
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
