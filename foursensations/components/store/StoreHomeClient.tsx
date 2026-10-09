"use client";

import Link from "next/link";
import Image from "next/image";
import hero1Image from "@/assets/foursensations/hero1.webp";
import hero2Image from "@/assets/foursensations/hero2.webp";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useReveal } from "@/hooks/useReveal";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { BeautyAiAdvisor } from "@/components/store/BeautyAiAdvisor";
import { BrandInnovationStrip } from "@/components/store/BrandInnovationStrip";
import { StoreProductCard } from "@/components/store/store-product-card";
import { CategoryShowcaseStrip } from "@/components/store/CategoryShowcaseStrip";
import { TechAmbient } from "@/components/ui/TechAmbient";
import { TintHomePreview } from "@/components/store/tints/TintHomePreview";
import { sortProductsForHomeDisplay } from "@/lib/storefront-product-order";
import {
  enrichStorefrontDisplayProducts,
  resolveStorefrontDisplayAfterFilter,
} from "@/lib/store/variant-groups";
import { HAIR_SUBCATEGORY_ORDER, productBelongsToHairSubcategory } from "@/lib/hair-subcategories";
import { STOREFRONT_MARQUEE_MESSAGES } from "@/lib/store-marquee-messages";
import { withBombaCapilarProduct } from "@/lib/bomba-capilar";
import type { StoreProduct } from "@/lib/types/product";
import type { StoreCombo } from "@/lib/types/store-combo";
import type { TintBubbleItem } from "@/lib/tints";
import { HomeCombosPromo } from "@/components/store/CombosPromo";
import { getWhatsAppHref } from "@/lib/storefront-contact";
import { WHOLESALE_THRESHOLD_COP } from "@/lib/admin/customer-crm";
import { formatPrice } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import type { StaticImageData } from "next/image";
import proteinaCover from "@/assets/productos/FS001 Proteína 10 en 1/FS001-1.webp";
import dulceRenacerCover from "@/assets/productos/FS002 Dulce Renacer/FS002-1.webp";
import primaveralCover from "@/assets/productos/FS003 Sensación Primaveral/FS003-1.webp";
import scalpCover from "@/assets/productos/FS006 Scalp Therapy/FS006-1.webp";
import accesoriosCover from "@/assets/productos/FS027 Accesorios/FS027-1.webp";

const HERO_SLIDES: readonly StaticImageData[] = [hero1Image, hero2Image];
const DESKTOP_INITIAL_VISIBLE_PRODUCTS = 32;
const MOBILE_INITIAL_VISIBLE_PRODUCTS = 10;
const DESKTOP_LOAD_MORE_PRODUCTS = 20;
const MOBILE_LOAD_MORE_PRODUCTS = 10;
const MOBILE_FEATURED_BREAKPOINT = 768;

type StoreHomeClientProps = {
  tintItems?: TintBubbleItem[];
  initialProducts?: StoreProduct[];
  initialCombos?: StoreCombo[];
};

export function StoreHomeClient({
  tintItems = [],
  initialProducts = [],
  initialCombos = [],
}: StoreHomeClientProps) {
  const {
    catalogProducts,
    menuConfig,
    categoryPath,
    showToast,
    openProductModal,
    addToCart,
    toggleFavorite,
    favorites,
  } = useStorefrontUi();

  const products = withBombaCapilarProduct(catalogProducts.length > 0 ? catalogProducts : initialProducts);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [manualSub, setManualSub] = useState<string | null>(null);
  const [sortValue, setSortValue] = useState<string>("default");
  const [heroBannerIndex, setHeroBannerIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(DESKTOP_INITIAL_VISIBLE_PRODUCTS);
  const [loadMoreStep, setLoadMoreStep] = useState(DESKTOP_LOAD_MORE_PRODUCTS);

  useReveal();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroBannerIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 12000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    let list: StoreProduct[];
    if (activeCategory === "__sub__" && manualSub != null) {
      list = products.filter(
        (p) => productBelongsToHairSubcategory(p.name, manualSub) || p.subcategory === manualSub,
      );
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

  return (
    <>
      <section className="hero-section" aria-label="Destacados Four Sensations">
        <div className="banner-placeholder-wrapper" id="hero-banner">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.src}
              className={`hero-banner-layer${heroBannerIndex === index ? " active" : ""}`}
            >
              <Image
                src={slide}
                alt={index === 0 ? "Dulce Renacer y Sensación Primavera" : "Tu ritual capilar soñado"}
                className="hero-banner-kenburns"
                sizes="100vw"
                fill
                priority={index === 0}
              />
            </div>
          ))}
          <Link
            href={`/categoria/${categoryPath("Cuidado capilar")}`}
            className="hero1-discover"
            prefetch
          >
            <span>Descúbrelos aquí</span>
            <span className="hero1-discover__arrow" aria-hidden>
              →
            </span>
          </Link>
        </div>
      </section>

      <div className="marquee-strip">
        <div className="marquee-track" id="marquee-track">
          {[...STOREFRONT_MARQUEE_MESSAGES, ...STOREFRONT_MARQUEE_MESSAGES].map((text, i) => (
            <span key={`${text}-${i}`} className="marquee-item">
              {text}
            </span>
          ))}
        </div>
      </div>

      <CategoryShowcaseStrip
        onSelectSubcategory={(sub) => {
          setActiveCategory("__sub__");
          setManualSub(sub);
          document.getElementById("featured")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        activeSubcategory={manualSub}
      />

      <BeautyAiAdvisor />

      {tintItems.length > 0 && <TintHomePreview items={tintItems} />}

      <BrandInnovationStrip />

      <section className="trust-section">
        <div className="container">
          <div className="trust-grid">
            <div className="trust-item">
              <div className="trust-icon">🚚</div>
              <div>
                <div className="trust-title">Envío a toda Colombia</div>
                <div className="trust-desc">Despacho desde Manizales · Máx. 2 días hábiles de preparación</div>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">🔄</div>
              <div>
                <div className="trust-title">Garantía legal</div>
                <div className="trust-desc">Sin cambios por gusto · Calidad e idoneidad según la ley</div>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">✅</div>
              <div>
                <div className="trust-title">Productos originales</div>
                <div className="trust-desc">Fórmulas Four Sensations, con trazabilidad de origen</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeCombosPromo combos={initialCombos} />

      <section className="section-pad" style={{ background: "var(--ivory)" }}>
        <div className="container reveal">
          <div className="promo-grid">
            <div
              className="promo-card"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(240, 228, 240, 0.62) 0%, rgba(197, 187, 218, 0.55) 100%), url(${dulceRenacerCover.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div>
                <div className="promo-label">🌸 Categoría destacada</div>
                <div className="promo-title">
                  Cuidado
                  <br />
                  <em>capilar</em>
                </div>
              </div>
              <Link href={`/categoria/${categoryPath("Cuidado capilar")}`} className="btn btn-primary btn-sm" prefetch>
                Ver colección →
              </Link>
              <div className="promo-deco">💜</div>
            </div>
            <div
              className="promo-card"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(212, 232, 228, 0.58) 0%, rgba(168, 191, 187, 0.5) 100%), url(${accesoriosCover.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div>
                <div className="promo-label">🎀 El detalle del ritual</div>
                <div className="promo-title">
                  Accesorios
                  <br />
                  <em>capilares</em>
                </div>
              </div>
              <Link href={`/categoria/${categoryPath("Accesorios")}`} className="btn btn-primary btn-sm" prefetch>
                Explorar →
              </Link>
              <div className="promo-deco">✨</div>
            </div>
            <div className="promo-card wide" style={{ background: "linear-gradient(135deg, var(--dark) 0%, var(--dark-mid) 100%)", color: "white" }}>
              <div>
                <div className="promo-label" style={{ color: "rgba(255,255,255,0.6)" }}>
                  📦 Programa exclusivo
                </div>
                <div className="promo-title" style={{ color: "white" }}>
                  Compra <em style={{ color: "var(--blush)" }}>mayorista</em> desde {formatPrice(WHOLESALE_THRESHOLD_COP)}
                </div>
              </div>
              <Link href="/mayorista" className="btn btn-outline btn-sm" style={{ color: "white", borderColor: "white" }}>
                Ver programa →
              </Link>
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
            <p className="section-sub">Líneas Four Sensations para nutrir, reconstruir y vestir tu cabello. Calidad de casa, resultados que se sienten.</p>
          </div>

          <div className="filter-row reveal">
            <div className="filter-chips">
              <button
                type="button"
                className={`chip ${activeCategory === "all" && !manualSub ? "active" : ""}`}
                onClick={() => {
                  setActiveCategory("all");
                  setManualSub(null);
                }}
              >
                Todos
              </button>
              {HAIR_SUBCATEGORY_ORDER.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  className={`chip ${activeCategory === "__sub__" && manualSub === sub ? "active" : ""}`}
                  onClick={() => {
                    setActiveCategory("__sub__");
                    setManualSub(sub);
                  }}
                >
                  {sub}
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
            <div className="section-eyebrow">El Club de los Cabellos Perfectos</div>
            <h2 className="section-title">
              Rituales para <em>cada momento</em>
            </h2>
          </div>
          <div className="lifestyle-grid">
            {[
              {
                image: dulceRenacerCover,
                cat: "Tratamientos",
                name: "Nutrir y reconstruir",
                href: `/categoria/${categoryPath("Cuidado capilar")}`,
              },
              {
                image: proteinaCover,
                cat: "Proteína 10 en 1",
                name: "Fibra con estructura",
                href: `/categoria/${categoryPath("Cuidado capilar")}`,
              },
              {
                image: primaveralCover,
                cat: "Shampoo y Acondicionador",
                name: "Equilibrio del cuero cabelludo",
                href: `/categoria/${categoryPath("Cuidado capilar")}`,
              },
              {
                image: scalpCover,
                cat: "Crecimiento y Fortalecimiento",
                name: "Scalp en calma",
                href: `/categoria/${categoryPath("Cuidado capilar")}`,
              },
              {
                image: accesoriosCover,
                cat: "Accesorios",
                name: "El detalle que cierra el look",
                href: `/categoria/${categoryPath("Accesorios")}`,
              },
            ].map(({ image, cat, name, href }) => (
              <Link key={name} href={href} className="lifestyle-card" prefetch>
                <div
                  className="lifestyle-card-bg"
                  style={{
                    backgroundImage: `url(${image.src})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                />
                <div className="lifestyle-card-overlay">
                  <div className="lifestyle-card-cat">{cat}</div>
                  <div className="lifestyle-card-name">{name}</div>
                </div>
              </Link>
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
              ["María Fernanda G.", "Medellín · Cuidado capilar", "M", "Dulce Renacer dejó mi cabello más dócil y con brillo; lo siento nutrido, no pesado."],
              ["Valentina P.", "Bogotá · Tratamientos", "V", "La Proteína 10 en 1 me armó la fibra después de procesos. Se volvió parte de mi ritual."],
              ["Camila R.", "Cali · Accesorios", "C", "El cepillo y las ligas acompañan la fórmula: el look queda sujeto sin maltratar."],
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
            El Club de los <em>Cabellos Perfectos</em>
          </div>
          <p className="newsletter-sub">Novedades de líneas, rituales y despachos desde Manizales. Sin spam: solo lo que suma a tu cabello.</p>
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
              <BrandLogo variant="store" inverted />
              <p className="footer-desc">
                Four Sensations — marca colombiana de cuidado capilar. El Club de los Cabellos Perfectos. Envíos a todo Colombia desde Manizales.
              </p>
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
                <Link href="/">Sobre nosotros</Link>
                <Link href="/mayorista">Programa mayorista</Link>
                <a href={getWhatsAppHref("Hola Four Sensations, quiero información para trabajar con ustedes.")} target="_blank" rel="noreferrer">
                  Trabaja con nosotros
                </a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Ayuda</h4>
              <div className="footer-links">
                <a href={getWhatsAppHref("Hola Four Sensations, necesito ayuda con un pedido.")} target="_blank" rel="noreferrer">
                  WhatsApp de atención
                </a>
                <Link href="/cuenta/pedidos">Mis pedidos</Link>
                <Link href="/politicas-envio">Envíos, garantía y posventa</Link>
                <Link href="/politicas-privacidad">Política de privacidad</Link>
                <Link href="/terminos-condiciones">Términos y condiciones</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="footer-bottom">
            <span>© 2026 Four Sensations. Todos los derechos reservados.</span>
            <div className="footer-payments">
              <span className="payment-chip">ePayco</span>
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
