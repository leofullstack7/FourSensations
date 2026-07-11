"use client";

import Link from "next/link";
import Image from "next/image";
import banner2Image from "@/app/banner2.webp";
import banner2MovilImage from "@/app/banner2-movil.webp";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useReveal } from "@/hooks/useReveal";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { BeautyAiAdvisor } from "@/components/store/BeautyAiAdvisor";
import { GinnaInnovationStrip } from "@/components/store/GinnaInnovationStrip";
import { StoreProductCard } from "@/components/store/store-product-card";
import { CategoryShowcaseStrip } from "@/components/store/CategoryShowcaseStrip";
import { TechAmbient } from "@/components/ui/TechAmbient";
import { TintHomePreview } from "@/components/store/tints/TintHomePreview";
import { sortProductsForHomeDisplay } from "@/lib/storefront-product-order";
import {
  enrichStorefrontDisplayProducts,
  resolveStorefrontDisplayAfterFilter,
} from "@/lib/store/variant-groups";
import { catKeyFromDisplayName } from "@/lib/category-labels";
import type { StoreProduct } from "@/lib/types/product";
import type { TintBubbleItem } from "@/lib/tints";
import { useCallback, useEffect, useMemo, useState } from "react";

const HERO_BANNERS_DESKTOP = [banner2Image.src, "/banner.webp"] as const;
const HERO_BANNERS_MOBILE = [banner2MovilImage.src, "/banner-movil.webp"] as const;
const DESKTOP_INITIAL_VISIBLE_PRODUCTS = 32;
const MOBILE_INITIAL_VISIBLE_PRODUCTS = 10;
const DESKTOP_LOAD_MORE_PRODUCTS = 20;
const MOBILE_LOAD_MORE_PRODUCTS = 10;
const MOBILE_FEATURED_BREAKPOINT = 768;

type StoreHomeClientProps = {
  tintItems?: TintBubbleItem[];
  initialProducts?: StoreProduct[];
};

export function StoreHomeClient({ tintItems = [], initialProducts = [] }: StoreHomeClientProps) {
  const {
    catalogProducts,
    menuConfig,
    categoryPath,
    showToast,
    openProductModal,
    openSearch,
    addToCart,
    toggleFavorite,
    favorites,
  } = useStorefrontUi();

  const products = catalogProducts.length > 0 ? catalogProducts : initialProducts;

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [manualSub, setManualSub] = useState<string | null>(null);
  const [sortValue, setSortValue] = useState<string>("default");
  const [heroBannerIndex, setHeroBannerIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(DESKTOP_INITIAL_VISIBLE_PRODUCTS);
  const [loadMoreStep, setLoadMoreStep] = useState(DESKTOP_LOAD_MORE_PRODUCTS);
  const isPrimaryOnScreen = heroBannerIndex === 1;
  const isSecondaryBanner = heroBannerIndex === 0;

  useReveal();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroBannerIndex((prev) => (prev + 1) % HERO_BANNERS_DESKTOP.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    let list: StoreProduct[];
    if (activeCategory === "__sub__" && manualSub != null) {
      list = products.filter((p) => p.subcategory === manualSub);
    } else if (activeCategory === "all") {
      list = [...products];
    } else {
      list = products.filter((p) => p.category === activeCategory);
    }

    if (sortValue === "default") {
      const sorted = sortProductsForHomeDisplay(list);
      return enrichStorefrontDisplayProducts(
        resolveStorefrontDisplayAfterFilter(sorted, products),
        products
      );
    }

    const copy = [...list];
    if (sortValue === "price-asc") copy.sort((a, b) => a.price - b.price);
    else if (sortValue === "price-desc") copy.sort((a, b) => b.price - a.price);
    else if (sortValue === "rating") copy.sort((a, b) => b.rating - a.rating);
    else if (sortValue === "new") copy.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return enrichStorefrontDisplayProducts(resolveStorefrontDisplayAfterFilter(copy, products), products);
  }, [products, activeCategory, manualSub, sortValue]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_FEATURED_BREAKPOINT}px)`);
    const applyLimits = () => {
      const mobile = mq.matches;
      setLoadMoreStep(mobile ? MOBILE_LOAD_MORE_PRODUCTS : DESKTOP_LOAD_MORE_PRODUCTS);
      setVisibleCount(mobile ? MOBILE_INITIAL_VISIBLE_PRODUCTS : DESKTOP_INITIAL_VISIBLE_PRODUCTS);
    };
    applyLimits();
    mq.addEventListener("change", applyLimits);
    return () => mq.removeEventListener("change", applyLimits);
  }, []);

  useEffect(() => {
    const mobile = window.matchMedia(`(max-width: ${MOBILE_FEATURED_BREAKPOINT}px)`).matches;
    setVisibleCount(mobile ? MOBILE_INITIAL_VISIBLE_PRODUCTS : DESKTOP_INITIAL_VISIBLE_PRODUCTS);
  }, [activeCategory, manualSub, sortValue]);

  const filterByCat = useCallback((cat: string) => {
    document.querySelector("#featured")?.scrollIntoView({ behavior: "smooth" });
    const key = catKeyFromDisplayName(cat);
    setActiveCategory(key);
    setManualSub(null);
  }, []);

  return (
    <>
      <section className="hero-section">
        <div className={`banner-placeholder-wrapper${isSecondaryBanner ? " banner-placeholder-wrapper-secondary" : ""}`} id="hero-banner">
          <div className="hero-tech-overlay" aria-hidden>
            <div className="hero-orb hero-orb--1" />
            <div className="hero-orb hero-orb--2" />
            <div className="hero-orb hero-orb--3" />
            <div className="hero-grid-lines" />
          </div>
          <div
            className={`hero-banner-layer hero-banner-layer--desktop${heroBannerIndex === 0 ? " active" : ""}`}
            style={{ backgroundImage: `url("${HERO_BANNERS_DESKTOP[0]}")` }}
          />
          <div
            className={`hero-banner-layer hero-banner-layer--mobile${heroBannerIndex === 0 ? " active" : ""}`}
            style={{ backgroundImage: `url("${HERO_BANNERS_MOBILE[0]}")` }}
          />
          <div
            className={`hero-banner-layer hero-banner-layer--desktop${heroBannerIndex === 1 ? " active" : ""}`}
            style={{ backgroundImage: `url("${HERO_BANNERS_DESKTOP[1]}")` }}
          />
          <div
            className={`hero-banner-layer hero-banner-layer--mobile${heroBannerIndex === 1 ? " active" : ""}`}
            style={{ backgroundImage: `url("${HERO_BANNERS_MOBILE[1]}")` }}
          />
          <div className="hero-foreground">
            {isPrimaryOnScreen ? (
              <div className="hero-copy">
                <div className="hero-eyebrow-tag">✨ Colección 2025 — Ya disponible</div>
                <h1 className="hero-main-title">
                  Tu belleza,
                  <br />
                  <em>sin límites</em>
                </h1>
                <p className="hero-subtitle">
                  Descubre cosméticos premium, cuidado de piel y capilar curados con amor para realzar tu brillo natural.
                </p>
              </div>
            ) : null}
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-num">+2K</div>
                <div className="hero-stat-label">Clientas felices</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-num">150+</div>
                <div className="hero-stat-label">Productos</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-num">5★</div>
                <div className="hero-stat-label">Calificación</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-num">🚚</div>
                <div className="hero-stat-label">Envío a Colombia</div>
              </div>
            </div>
            <div className={`hero-center-content${isPrimaryOnScreen ? "" : " hero-center-content-minimal"}`}>
              <div className="hero-cta-group">
                <button type="button" className="btn btn-primary btn-lg btn-glow" onClick={() => document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" })}>
                  🛍️ Ver Productos
                </button>
                <button
                  type="button"
                  className={`btn btn-lg ${isSecondaryBanner ? "hero-btn-secondary-solid" : "btn-outline"}`}
                  onClick={openSearch}
                >
                  ✨ Buscar mi producto
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="marquee-strip">
        <div className="marquee-track" id="marquee-track">
          <span className="marquee-item">✨ Maquillaje de larga duración</span>
          <span className="marquee-item">💆 Cuidado capilar premium</span>
          <span className="marquee-item">
            <span>NUEVO</span> Sérum Vitamina C
          </span>
          <span className="marquee-item">🌿 Skincare natural</span>
          <span className="marquee-item">💅 Uñas que enamoran</span>
          <span className="marquee-item">📦 Mayorista disponible</span>
          <span className="marquee-item">🚚 Envío gratis +$150K</span>
          <span className="marquee-item">✨ Maquillaje de larga duración</span>
          <span className="marquee-item">💆 Cuidado capilar premium</span>
          <span className="marquee-item">
            <span>NUEVO</span> Sérum Vitamina C
          </span>
          <span className="marquee-item">🌿 Skincare natural</span>
          <span className="marquee-item">💅 Uñas que enamoran</span>
          <span className="marquee-item">📦 Mayorista disponible</span>
          <span className="marquee-item">🚚 Envío gratis +$150K</span>
        </div>
      </div>

      <BeautyAiAdvisor />

      <CategoryShowcaseStrip categoryPath={categoryPath} />

      {tintItems.length > 0 && <TintHomePreview items={tintItems} />}

      <GinnaInnovationStrip />

      <section className="trust-section">
        <div className="container">
          <div className="trust-grid">
            <div className="trust-item">
              <div className="trust-icon">🚚</div>
              <div>
                <div className="trust-title">Envío a toda Colombia</div>
                <div className="trust-desc">Gratis en compras superiores a $150.000</div>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">🔄</div>
              <div>
                <div className="trust-title">Devoluciones 7 días</div>
                <div className="trust-desc">Satisfacción o te devolvemos</div>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✅</div>
              <div>
                <div className="trust-title">Productos originales</div>
                <div className="trust-desc">100% auténticos y certificados</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ background: "var(--ivory)" }}>
        <div className="container reveal">
          <div className="promo-grid">
            <div className="promo-card">
              <div>
                <div className="promo-label">🌸 Categoría destacada</div>
                <div className="promo-title">
                  Skincare
                  <br />
                  <em>Natural</em>
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => filterByCat("Cuidado piel")}>
                Ver colección →
              </button>
              <div className="promo-deco">🌿</div>
            </div>
            <div className="promo-card">
              <div>
                <div className="promo-label">💄 Tendencia 2025</div>
                <div className="promo-title">
                  Maquillaje
                  <br />
                  <em>Luminoso</em>
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => filterByCat("Maquillaje")}>
                Explorar →
              </button>
              <div className="promo-deco">✨</div>
            </div>
            <div className="promo-card wide" style={{ background: "linear-gradient(135deg, var(--dark) 0%, var(--dark-mid) 100%)", color: "white" }}>
              <div>
                <div className="promo-label" style={{ color: "rgba(255,255,255,0.6)" }}>
                  📦 Programa exclusivo
                </div>
                <div className="promo-title" style={{ color: "white" }}>
                  Compra <em style={{ color: "var(--blush)" }}>mayorista</em> y ahorra hasta un 30%
                </div>
              </div>
              <button type="button" className="btn btn-outline btn-sm" style={{ color: "white", borderColor: "white" }} onClick={() => filterByCat("Mayorista")}>
                Registrarme →
              </button>
              <div className="promo-deco" style={{ color: "white" }}>
                🎁
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="products-section section-pad" id="featured">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">Nuestra Colección</div>
            <h2 className="section-title">
              Productos <em>Destacados</em>
            </h2>
            <p className="section-sub">Curados con amor para potenciar tu belleza natural. Calidad premium, resultados reales.</p>
          </div>

          <div className="filter-row reveal">
            <div className="filter-chips">
              {[
                ["all", "Todos"],
                ["maquillaje", "Maquillaje"],
                ["cuidado-piel", "Cuidado Piel"],
                ["cuidado-capilar", "Capilar"],
                ["unas", "Uñas"],
                ["hombres", "Hombres"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`chip ${activeCategory === key ? "active" : ""}`}
                  data-cat={key}
                  onClick={() => {
                    setActiveCategory(key as string);
                    setManualSub(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <select className="sort-select" id="sort-select" value={sortValue} onChange={(e) => setSortValue(e.target.value)}>
              <option value="default">Ordenar por</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="rating">Mejor calificados</option>
              <option value="new">Más nuevos</option>
            </select>
          </div>

          <div className="products-grid" id="products-grid-main">
            {filteredProducts.slice(0, visibleCount).map((p, i) => (
              <StoreProductCard
                key={p.id}
                product={p}
                isFav={favorites.includes(p.id)}
                onOpen={openProductModal}
                onToggleFav={toggleFavorite}
                onAddCart={addToCart}
                imagePriority={i < 4}
              />
            ))}
          </div>

          {filteredProducts.length > visibleCount && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 40 }}>
              <button
                type="button"
                className="btn btn-outline btn-lg"
                onClick={() => setVisibleCount((c) => c + loadMoreStep)}
              >
                Ver más
              </button>
              <span style={{ fontSize: 13, color: "var(--text-muted, #888)" }}>
                Mostrando {Math.min(visibleCount, filteredProducts.length)} de {filteredProducts.length} productos
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="lifestyle-section section-pad">
        <div className="container reveal">
          <div className="section-header" style={{ marginBottom: 36 }}>
            <div className="section-eyebrow">Inspiración</div>
            <h2 className="section-title">
              Belleza para <em>cada momento</em>
            </h2>
          </div>
          <div className="lifestyle-grid">
            {[
              { image: "/glam.webp", cat: "Tendencia", name: "Look Natural Glam" },
              { image: "/skin.webp", cat: "Skincare", name: "Rutina de noche" },
              { image: "/cabello.webp", cat: "Capilar", name: "Cabello Sedoso" },
              { image: "/manicure.webp", cat: "Uñas", name: "Manicure Perfecta" },
              { image: "/glow.webp", cat: "Esencial", name: "Glow desde adentro" },
            ].map(({ image, cat, name }) => (
              <div key={name as string} className="lifestyle-card">
                <div
                  className="lifestyle-card-bg"
                  style={{
                    backgroundImage: `url(${image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <div className="lifestyle-card-overlay">
                  <div className="lifestyle-card-cat">{cat}</div>
                  <div className="lifestyle-card-name">{name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials-section section-pad">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">Lo que dicen</div>
            <h2 className="section-title">
              Clientas que nos <em>aman</em>
            </h2>
          </div>
          <div className="testimonials-grid reveal-stagger">
            {[
              ["María Fernanda G.", "Medellín · Cuidado Piel", "M", "El sérum de vitamina C transformó mi piel en 2 semanas..."],
              ["Valentina P.", "Bogotá · Maquillaje", "V", "La paleta de sombras Bloom es increíble..."],
              ["Camila R.", "Cali · Cuidado Capilar", "C", "La mascarilla capilar hizo un milagro..."],
            ].map(([name, detail, av, text]) => (
              <div key={name as string} className="testimonial-card">
                <div className="t-stars">★★★★★</div>
                <p className="t-text">&quot;{text}&quot;</p>
                <div className="t-user">
                  <div className="t-avatar">{av}</div>
                  <div>
                    <div className="t-name">{name}</div>
                    <div className="t-detail">{detail}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="newsletter-section">
        <TechAmbient variant="subtle" />
        <div className="container newsletter-content reveal">
          <div className="section-eyebrow" style={{ color: "var(--blush)" }}>
            Únete a nuestra comunidad
          </div>
          <div className="newsletter-title">
            Suscríbete y recibe <em>20% off</em>
          </div>
          <p className="newsletter-sub">En tu primera compra. Más tips de belleza, nuevos lanzamientos y ofertas exclusivas.</p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="tu@correo.com" />
            <button type="button" onClick={() => showToast("¡Gracias! Revisa tu correo", "success", "💌")}>
              Suscribirme
            </button>
          </form>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <BrandLogo variant="store" />
              <p className="footer-desc">Tu aliada de belleza. Cosméticos de alta calidad, cuidado de piel y capilar con envío a toda Colombia.</p>
              <div className="social-links">
                <a href="#" className="social-link">📘</a>
                <a href="#" className="social-link">📸</a>
                <a href="#" className="social-link">🐦</a>
                <a href="#" className="social-link">▶️</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Productos</h4>
              <div className="footer-links">
                {Object.keys(menuConfig).map((catName) => (
                  <Link key={catName} href={`/categoria/${categoryPath(catName)}`} prefetch>
                    {catName}
                  </Link>
                ))}
              </div>
            </div>
            <div className="footer-col">
              <h4>Empresa</h4>
              <div className="footer-links">
                <a href="#">Sobre nosotros</a>
                <a href="#">Blog de belleza</a>
                <a href="#">Programa mayorista</a>
                <a href="#">Trabaja con nosotros</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Ayuda</h4>
              <div className="footer-links">
                <a href="#">Centro de ayuda</a>
                <a href="#">Rastrear pedido</a>
                <a href="#">Devoluciones</a>
                <Link href="/politicas-envio">Políticas de envío</Link>
                <Link href="/politicas-privacidad">Política de privacidad</Link>
                <Link href="/terminos-condiciones">Términos y condiciones</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="footer-bottom">
            <span>© 2025 GinnaBeauty. Todos los derechos reservados.</span>
            <div className="footer-payments">
              <span className="payment-chip">ePayco</span>
              <span className="payment-chip">Bold</span>
              <span className="payment-chip">PSE</span>
              <span className="payment-chip">Visa</span>
              <span className="payment-chip">Mastercard</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
