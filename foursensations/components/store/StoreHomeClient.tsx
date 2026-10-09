"use client";

import Link from "next/link";
import Image from "next/image";
import heroPc1 from "@/assets/foursensations/banners/pc1.jpeg";
import heroPc2 from "@/assets/foursensations/banners/pc2.jpeg";
import heroPc3 from "@/assets/foursensations/banners/3.jpeg";
import heroPc4 from "@/assets/foursensations/banners/pc4.jpeg";
import heroMobile1 from "@/assets/foursensations/banners/movil1.jpeg";
import heroMobile2 from "@/assets/foursensations/banners/movil2.jpeg";
import heroMobile3 from "@/assets/foursensations/banners/movil3.jpeg";
import heroMobile4 from "@/assets/foursensations/banners/movil4.jpeg";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useReveal } from "@/hooks/useReveal";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { BeautyAiAdvisor } from "@/components/store/BeautyAiAdvisor";
import { StoreProductCard } from "@/components/store/store-product-card";
import { CategoryShowcaseStrip } from "@/components/store/CategoryShowcaseStrip";
import { TechAmbient } from "@/components/ui/TechAmbient";
import { TintHomePreview } from "@/components/store/tints/TintHomePreview";
import { sortProductsForHomeDisplay } from "@/lib/storefront-product-order";
import {
  enrichStorefrontDisplayProducts,
  resolveStorefrontDisplayAfterFilter,
} from "@/lib/store/variant-groups";
import { isHomeClubFavoriteProduct } from "@/lib/home-club-favorites";
import { productMatchesHairSubcategory } from "@/lib/hair-subcategories";
import { STOREFRONT_BRAND_MARQUEE_MESSAGES } from "@/lib/store-brand-marquee-messages";
import type { StoreProduct } from "@/lib/types/product";
import type { StoreCombo } from "@/lib/types/store-combo";
import type { TintBubbleItem } from "@/lib/tints";
import { HomeCombosPromo } from "@/components/store/CombosPromo";
import { getWhatsAppHref, WHATSAPP_SUPPORT_MESSAGE } from "@/lib/storefront-contact";
import { pickRotatingTestimonials } from "@/lib/store-testimonials";
import { WHOLESALE_THRESHOLD_COP } from "@/lib/admin/customer-crm";
import { formatPrice } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import type { StaticImageData } from "next/image";
import dulceRenacerCover from "@/assets/productos/FS002 Dulce Renacer/FS002-1.webp";
import accesoriosCover from "@/assets/productos/FS027 Accesorios/FS027-1.webp";

const HERO_SLIDES: readonly {
  desktop: StaticImageData;
  mobile: StaticImageData;
  alt: string;
  href: string;
}[] = [
  {
    desktop: heroPc1,
    mobile: heroMobile1,
    alt: "Un solo spray y todo cambia. Cuatro fragancias Hair Mist.",
    href: "/categoria/cuidado-capilar?grupo=Hair%20Mist",
  },
  {
    desktop: heroPc2,
    mobile: heroMobile2,
    alt: "Rise and Shine. El toque final para un cabello ultrabrillante.",
    href: `/categoria/cuidado-capilar?grupo=${encodeURIComponent("Finalizadores y Protección")}`,
  },
  {
    desktop: heroPc3,
    mobile: heroMobile3,
    alt: "Una bomba: el pre-shampoo para los días en que tu cabello pide más.",
    href: `/categoria/cuidado-capilar?grupo=${encodeURIComponent("Pre - Shampoo")}`,
  },
  {
    desktop: heroPc4,
    mobile: heroMobile4,
    alt: "Tu nueva obsesión capilar empieza aquí.",
    href: "/categoria/cuidado-capilar",
  },
];
const DESKTOP_INITIAL_VISIBLE_PRODUCTS = 32;
const MOBILE_INITIAL_VISIBLE_PRODUCTS = 10;
const DESKTOP_LOAD_MORE_PRODUCTS = 20;
const MOBILE_LOAD_MORE_PRODUCTS = 10;
const MOBILE_FEATURED_BREAKPOINT = 768;
const HOME_TESTIMONIALS_ROTATION = pickRotatingTestimonials(3);

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

  const products = catalogProducts.length > 0 ? catalogProducts : initialProducts;

  const [sortValue, setSortValue] = useState<string>("default");
  const [manualSub, setManualSub] = useState<string | null>(null);
  const [heroBannerIndex, setHeroBannerIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(DESKTOP_INITIAL_VISIBLE_PRODUCTS);
  const [loadMoreStep, setLoadMoreStep] = useState(DESKTOP_LOAD_MORE_PRODUCTS);

  useReveal();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroBannerIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    let list: StoreProduct[];
    if (manualSub) {
      list = products.filter((p) => productMatchesHairSubcategory(p, manualSub));
    } else {
      list = products.filter((p) => isHomeClubFavoriteProduct(p.name));
      if (list.length === 0) list = [...products];
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
  }, [products, sortValue, manualSub]);

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
  }, [sortValue, manualSub]);

  return (
    <>
      <section className="hero-section" aria-label="Destacados Four Sensations">
        <div className="banner-placeholder-wrapper" id="hero-banner">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.desktop.src}
              className={`hero-banner-layer${heroBannerIndex === index ? " active" : ""}`}
            >
              <Image
                src={slide.desktop}
                alt=""
                className="hero-banner-kenburns hero-banner-kenburns--desktop"
                sizes="100vw"
                fill
                priority={index === 0}
              />
              <Image
                src={slide.mobile}
                alt=""
                className="hero-banner-kenburns hero-banner-kenburns--mobile"
                sizes="100vw"
                fill
                priority={index === 0}
              />
              <Link href={slide.href} className="hero-banner-hit" prefetch aria-label={slide.alt} />
            </div>
          ))}
        </div>
      </section>

      <div className="marquee-strip">
        <div className="marquee-track" id="marquee-track">
          {[...STOREFRONT_BRAND_MARQUEE_MESSAGES, ...STOREFRONT_BRAND_MARQUEE_MESSAGES].map((text, i) => (
            <span key={`${text}-${i}`} className="marquee-item">
              {text}
            </span>
          ))}
        </div>
      </div>

      <CategoryShowcaseStrip
        onSelectSubcategory={(sub) => {
          setManualSub(sub);
          document.getElementById("featured")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        activeSubcategory={manualSub}
      />

      <BeautyAiAdvisor />

      {tintItems.length > 0 && <TintHomePreview items={tintItems} />}

      <div className="marquee-strip marquee-strip--brand">
        <div className="marquee-track">
          {[...STOREFRONT_BRAND_MARQUEE_MESSAGES, ...STOREFRONT_BRAND_MARQUEE_MESSAGES].map((text, i) => (
            <span key={`brand-${text}-${i}`} className="marquee-item">
              {text}
            </span>
          ))}
        </div>
      </div>

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
                backgroundImage: `linear-gradient(135deg, rgba(255, 228, 220, 0.7) 0%, rgba(232, 180, 184, 0.55) 100%), url(${dulceRenacerCover.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div>
                <div className="promo-label">🧴 Piel y sensaciones</div>
                <div className="promo-title">
                  Cuidado
                  <br />
                  <em>corporal</em>
                </div>
              </div>
              <Link href={`/categoria/${categoryPath("Cuidado corporal")}`} className="btn btn-primary btn-sm" prefetch>
                Explorar →
              </Link>
              <div className="promo-deco">✨</div>
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
            <div className="section-eyebrow">{manualSub ? "Subcategoría" : "Productos Destacados"}</div>
            <h2 className="section-title">
              {manualSub ? (
                <>
                  {manualSub}
                </>
              ) : (
                <>
                  Los favoritos del <em>Club</em> 💗
                </>
              )}
            </h2>
            <p className="section-sub">
              {manualSub
                ? "Productos Four Sensations de esta línea. Toca otra subcategoría arriba o vuelve a los favoritos."
                : "Nuestros productos más amados, elegidos para transformar tu rutina y darle a tu cabello exactamente ese algo que le estaba faltando. ✨"}
            </p>
            {manualSub ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => setManualSub(null)}
              >
                Ver favoritos del Club
              </button>
            ) : null}
          </div>

          <div className="filter-row reveal" style={{ justifyContent: "flex-end" }}>
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

      <section className="testimonials-section section-pad">
        <div className="container">
          <div className="section-header reveal">
            <div className="section-eyebrow">Lo que dicen</div>
            <h2 className="section-title">
              Clientas que nos <em>aman</em>
            </h2>
          </div>
          <div className="testimonials-grid reveal-stagger">
            {HOME_TESTIMONIALS_ROTATION.map((t) => (
              <div key={`${t.name}-${t.city}`} className="testimonial-card">
                <div className="t-stars">★★★★★</div>
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
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="newsletter-section">
        <TechAmbient variant="subtle" />
        <div className="container newsletter-content reveal">
          <div className="section-eyebrow" style={{ color: "var(--blush)" }}>
            ¿Todavía no estás en el Club? 👀💗
          </div>
          <div className="newsletter-title">
            Esto te va a <em>interesar…</em>
          </div>
          <p className="newsletter-sub">
            Ser Four Girl tiene sus privilegios, SIEMPRE TIENEN LAS PRIMICIAS💌 Lanzamientos, ediciones limitadas,
            sorpresas, secretos capilares y novedades que definitivamente vas a querer tener en el radar.
          </p>
          <p className="newsletter-sub" style={{ marginTop: 8 }}>
            Déjanos tu correo y entra al Club de los Cabellos Perfectos
          </p>
          <form className="newsletter-form newsletter-form--club" onSubmit={(e) => e.preventDefault()}>
            <input type="text" name="name" placeholder="Tu nombre" autoComplete="name" />
            <input type="tel" name="phone" placeholder="+57 celular" autoComplete="tel" />
            <input type="email" name="email" placeholder="tu@correo.com" autoComplete="email" />
            <button type="button" onClick={() => showToast("¡Bienvenida al Club! 💗", "success", "💌")}>
              Suscribirme
            </button>
          </form>
          <p className="newsletter-legal">
            Al registrarte aceptas recibir correos electrónicos de marketing y mensajes de texto
          </p>
        </div>
      </section>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <BrandLogo variant="store" inverted />
              <p className="footer-desc">
                Four Sensations
                <br />
                ¡Creamos nuevas formas de amar, cuidar y disfrutar tu cabello!💗
                <br />
                <strong>BE YOU, BE FOUR SENSATIONS</strong>
                <br />
                Marca Colombiana 🇨🇴 · Hecho en Colombia
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
                <Link href="/sobre-nosotros">Sobre nosotros</Link>
                <Link href="/mayorista">Programa mayorista</Link>
                <a href={getWhatsAppHref("Hola Four Sensations, quiero información para trabajar con ustedes.")} target="_blank" rel="noreferrer">
                  Trabaja con nosotros
                </a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Ayuda</h4>
              <div className="footer-links">
                <a href={getWhatsAppHref(WHATSAPP_SUPPORT_MESSAGE)} target="_blank" rel="noreferrer">
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
            <span>© 2026 Four Sensations S.A.S. Todos los derechos reservados</span>
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
