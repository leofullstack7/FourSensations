"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatPrice } from "@/lib/format";
import { isHttpImageUrl } from "@/lib/util/image-url";
import type { StoreCombo } from "@/lib/types/store-combo";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import combosHero from "@/assets/foursensations/hero1.webp";

function savingsPct(combo: StoreCombo): number | null {
  if (combo.retailTotal <= combo.comboPrice) return null;
  return Math.round(((combo.retailTotal - combo.comboPrice) / combo.retailTotal) * 100);
}

export function ComboWaveCard({
  combo,
  featured = false,
}: {
  combo: StoreCombo;
  featured?: boolean;
}) {
  const { addComboToCart } = useStorefrontUi();
  const save = savingsPct(combo);
  const cover = combo.items.find((i) => isHttpImageUrl(i.product.imageUrl ?? ""))?.product;

  return (
    <article className={`gb-combo-wave-card${featured ? " gb-combo-wave-card--featured" : ""}`}>
      <div className="gb-combo-wave-ring" aria-hidden>
        <span className="gb-combo-wave-orbit gb-combo-wave-orbit--a" />
        <span className="gb-combo-wave-orbit gb-combo-wave-orbit--b" />
        <span className="gb-combo-wave-orbit gb-combo-wave-orbit--c" />
      </div>
      <div className="gb-combo-wave-inner">
        <div className="gb-combo-wave-cover">
          {cover && isHttpImageUrl(cover.imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.imageUrl!} alt="" />
          ) : (
            <span className="gb-combo-wave-emoji">{cover?.emoji || "🎁"}</span>
          )}
          {save != null ? <span className="gb-combo-wave-badge">Ahorra {save}%</span> : null}
        </div>
        <div className="gb-combo-wave-body">
          <p className="gb-combo-wave-eyebrow">Combos Four Sensations</p>
          <h3 className="gb-combo-wave-title">{combo.name}</h3>
          <ul className="gb-combo-wave-items">
            {combo.items.map((item) => (
              <li key={item.id}>
                <span className="gb-combo-wave-item-thumb">
                  {isHttpImageUrl(item.product.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.product.imageUrl!} alt="" />
                  ) : (
                    item.product.emoji || "•"
                  )}
                </span>
                <span className="gb-combo-wave-item-name">
                  {item.quantity > 1 ? `${item.quantity}× ` : ""}
                  {item.product.name}
                </span>
              </li>
            ))}
          </ul>
          <div className="gb-combo-wave-pricing">
            {combo.retailTotal > combo.comboPrice ? (
              <span className="gb-combo-wave-retail">{formatPrice(combo.retailTotal)}</span>
            ) : null}
            <span className="gb-combo-wave-price">{formatPrice(combo.comboPrice)}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm gb-combo-wave-cta"
            onClick={() => addComboToCart(combo)}
          >
            🛒 Llevar este combo
          </button>
        </div>
      </div>
    </article>
  );
}

/** Widget comercial del home (primera section-pad). */
export function HomeCombosPromo({ combos }: { combos: StoreCombo[] }) {
  const preview = useMemo(() => combos.slice(0, 3), [combos]);
  if (preview.length === 0) return null;

  return (
    <section className="section-pad gb-home-combos" aria-label="Combos promocionales">
      <div className="container">
        <div className="gb-home-combos-head reveal">
          <div>
            <div className="section-eyebrow">Sets exclusivos</div>
            <h2 className="section-title">
              Combos que <em>enamoran</em>
            </h2>
            <p className="section-sub">
              Rutinas listas para brillar: ahorra más llevando el set completo, curado por Four Sensations.
            </p>
          </div>
          <Link href="/combos" className="btn btn-outline">
            Ver todos los combos →
          </Link>
        </div>
        <div className={`gb-home-combos-grid gb-home-combos-grid--${Math.min(preview.length, 3)}`}>
          {preview.map((c) => (
            <ComboWaveCard key={c.id} combo={c} featured />
          ))}
        </div>
      </div>
    </section>
  );
}

export function CombosLandingClient({ combos }: { combos: StoreCombo[] }) {
  return (
    <main className="category-landing-page gb-combos-landing">
      <section
        className="category-landing-hero category-landing-hero--has-banner category-landing-hero--banner-light"
        data-landing-slug="combos"
        aria-label="Combos Four Sensations"
      >
        <div className="category-landing-hero-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={combosHero.src}
            alt=""
            className="category-landing-hero-banner"
            decoding="async"
          />
          <div className="category-landing-hero-inner category-landing-hero-inner--banner">
            <div className="category-landing-hero-copy">
              <div className="gb-tech-chip">
                <span className="gb-tech-live-dot" style={{ width: 6, height: 6 }} aria-hidden />
                Ofertas en set
              </div>
              <div className="category-landing-eyebrow">Combos Four Sensations</div>
              <h1 className="category-landing-title">
                Rituales en set.
                <br />
                Mejor precio.
              </h1>
              <p className="category-landing-subtitle">
                Sets de cuidado capilar Four Sensations para completar tu protocolo sin armar el carrito pieza a pieza.
              </p>
              <div className="category-landing-stats">
                <span className="category-landing-stat">🎁 {combos.length} combos activos</span>
                <span className="category-landing-stat">✦ Ahorro real en set</span>
                <span className="category-landing-stat">🛒 Carga directa al carrito</span>
              </div>
              <div className="category-landing-cta-row">
                <Link href="/" className="btn btn-outline btn-sm category-landing-cta-back">
                  Volver al home
                </Link>
                <a href="#combos-grid" className="btn btn-primary btn-sm category-landing-cta-primary">
                  Explorar combos
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad" id="combos-grid" style={{ paddingTop: 28 }}>
        <div className="container">
          {combos.length === 0 ? (
            <div className="gb-combos-empty">
              Pronto publicaremos nuevos combos. Mientras tanto explora el catálogo completo.
              <div style={{ marginTop: 16 }}>
                <Link href="/" className="btn btn-primary btn-sm">
                  Ir a la tienda
                </Link>
              </div>
            </div>
          ) : (
            <div className="gb-combos-page-grid">
              {combos.map((c) => (
                <ComboWaveCard key={c.id} combo={c} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
