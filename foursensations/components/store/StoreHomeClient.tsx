"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import heroPc1 from "@/assets/foursensations/banners/pc1.webp";
import heroPc2 from "@/assets/foursensations/banners/pc2.webp";
import heroPc3 from "@/assets/foursensations/banners/3.webp";
import heroPc4 from "@/assets/foursensations/banners/pc4.webp";
import heroMobile1 from "@/assets/foursensations/banners/movil1.webp";
import heroMobile2 from "@/assets/foursensations/banners/movil2.webp";
import heroMobile3 from "@/assets/foursensations/banners/movil3.webp";
import heroMobile4 from "@/assets/foursensations/banners/movil4.webp";
import { useReveal } from "@/hooks/useReveal";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreProductCard } from "@/components/store/store-product-card";
import { CategoryShowcaseStrip } from "@/components/store/CategoryShowcaseStrip";
import { homeClubFavoriteRank, isHomeClubFavoriteProduct } from "@/lib/home-club-favorites";
import { sortProductsForHomeDisplay } from "@/lib/storefront-product-order";
import {
  enrichStorefrontDisplayProducts,
  resolveStorefrontDisplayAfterFilter,
} from "@/lib/store/variant-groups";
import { productMatchesHairSubcategory } from "@/lib/hair-subcategories";
import { STOREFRONT_BRAND_MARQUEE_MESSAGES } from "@/lib/store-brand-marquee-messages";
import type { StoreProduct } from "@/lib/types/product";
import type { StoreCombo } from "@/lib/types/store-combo";
import type { TintBubbleItem } from "@/lib/tints";
import { WHOLESALE_THRESHOLD_COP } from "@/lib/admin/customer-crm";
import { formatPrice } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import type { StaticImageData } from "next/image";
import dulceRenacerCover from "@/assets/productos/FS002 Dulce Renacer/FS002-1.webp";
import accesoriosCover from "@/assets/productos/FS027 Accesorios/FS027-1.webp";
import {
  resolveShowcaseItems,
  type HomeContentSettings,
} from "@/lib/home-content";
import { useStoreNavigation } from "@/components/store/StoreNavigationProvider";
import { resolveStoreMenuGroupHref } from "@/lib/store/menu-item-href";

const BeautyAiAdvisor = dynamic(
  () => import("@/components/store/BeautyAiAdvisor").then((m) => m.BeautyAiAdvisor),
  { ssr: false, loading: () => null },
);
const TintHomePreview = dynamic(
  () => import("@/components/store/tints/TintHomePreview").then((m) => m.TintHomePreview),
  { ssr: false, loading: () => null },
);
const HomeCombosPromo = dynamic(
  () => import("@/components/store/CombosPromo").then((m) => m.HomeCombosPromo),
  { ssr: false, loading: () => null },
);
const HomeTestimonials = dynamic(
  () => import("@/components/store/HomeTestimonials").then((m) => m.HomeTestimonials),
  { ssr: false, loading: () => null },
);
const PromoDiagonalTrio = dynamic(
  () => import("@/components/store/PromoDiagonalTrio").then((m) => m.PromoDiagonalTrio),
  { ssr: false, loading: () => null },
);
const TechAmbient = dynamic(
  () => import("@/components/ui/TechAmbient").then((m) => m.TechAmbient),
  { ssr: false, loading: () => null },
);

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
const DESKTOP_INITIAL_VISIBLE_PRODUCTS = 12;
const MOBILE_INITIAL_VISIBLE_PRODUCTS = 6;
const DESKTOP_LOAD_MORE_PRODUCTS = 12;
const MOBILE_LOAD_MORE_PRODUCTS = 6;
const MOBILE_FEATURED_BREAKPOINT = 768;

type StoreHomeClientProps = {
  tintItems?: TintBubbleItem[];
  initialProducts?: StoreProduct[];
  initialCombos?: StoreCombo[];
  homeContent?: HomeContentSettings | null;
};

export function StoreHomeClient({
  tintItems = [],
  initialProducts = [],
  initialCombos = [],
  homeContent = null,
}: StoreHomeClientProps) {
  const {
    catalogProducts,
    categoryPath,
    showToast,
    openProductModal,
    addToCart,
    toggleFavorite,
    favorites,
  } = useStorefrontUi();
  const { navigateTo } = useStoreNavigation();

  const products = catalogProducts.length > 0 ? catalogProducts : initialProducts;

  const [sortValue, setSortValue] = useState<string>("default");
  const [manualSub, setManualSub] = useState<string | null>(null);
  const [heroBannerIndex, setHeroBannerIndex] = useState(0);
  const [heroIsMobile, setHeroIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(DESKTOP_INITIAL_VISIBLE_PRODUCTS);
  const [loadMoreStep, setLoadMoreStep] = useState(DESKTOP_LOAD_MORE_PRODUCTS);
  /** Secciones pesadas solo tras first paint (meta ≤6s). */
  const [deferHeavy, setDeferHeavy] = useState(false);

  useReveal();

  useEffect(() => {
    let cancelled = false;
    const t = globalThis.setTimeout(() => {
      if (!cancelled) setDeferHeavy(true);
    }, 750);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setHeroIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroBannerIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  /** Solo el slide activo al inicio; el siguiente se monta cuando ya diferimos peso. */
  const heroMountIndexes = useMemo(() => {
    if (!deferHeavy) return [heroBannerIndex];
    const next = (heroBannerIndex + 1) % HERO_SLIDES.length;
    return next === heroBannerIndex ? [heroBannerIndex] : [heroBannerIndex, next];
  }, [heroBannerIndex, deferHeavy]);

  const filteredProducts = useMemo(() => {
    let list: StoreProduct[];
    if (manualSub) {
      list = products.filter((p) => productMatchesHairSubcategory(p, manualSub));
    } else {
      list = products.filter((p) => isHomeClubFavoriteProduct(p.name));
      list.sort((a, b) => homeClubFavoriteRank(a.name) - homeClubFavoriteRank(b.name) || a.name.localeCompare(b.name, "es"));
    }

    if (sortValue === "default" && manualSub) {
      const sorted = sortProductsForHomeDisplay(list);
      return enrichStorefrontDisplayProducts(
        resolveStorefrontDisplayAfterFilter(sorted, products),
        products
      );
    }

    if (sortValue === "default") {
      return enrichStorefrontDisplayProducts(resolveStorefrontDisplayAfterFilter(list, products), products);
    }

    const copy = [...list];
    const photoRank = (p: StoreProduct) => (p.img?.trim() ? 1 : 0);
    if (sortValue === "price-asc") {
      copy.sort((a, b) => photoRank(b) - photoRank(a) || a.price - b.price);
    } else if (sortValue === "price-desc") {
      copy.sort((a, b) => photoRank(b) - photoRank(a) || b.price - a.price);
    } else if (sortValue === "rating") {
      copy.sort((a, b) => photoRank(b) - photoRank(a) || b.rating - a.rating);
    } else if (sortValue === "new") {
      copy.sort((a, b) => photoRank(b) - photoRank(a) || Number(b.isNew) - Number(a.isNew));
    }
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
          {heroMountIndexes.map((index) => {
            const slide = HERO_SLIDES[index]!;
            const isActive = heroBannerIndex === index;
            const src = heroIsMobile ? slide.mobile : slide.desktop;
            return (
              <div
                key={`${slide.desktop.src}-${heroIsMobile ? "m" : "d"}`}
                className={`hero-banner-layer${isActive ? " active" : ""}`}
              >
                <Image
                  src={src}
                  alt=""
                  className={`hero-banner-kenburns${heroIsMobile ? " hero-banner-kenburns--mobile" : " hero-banner-kenburns--desktop"}`}
                  sizes="100vw"
                  fill
                  priority={index === 0}
                  quality={index === 0 ? 70 : 60}
                  placeholder="blur"
                />
                {isActive ? (
                  <Link href={slide.href} className="hero-banner-hit" prefetch aria-label={slide.alt} />
                ) : null}
              </div>
            );
          })}
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
        items={resolveShowcaseItems(homeContent?.showcaseImages)}
        onSelectSubcategory={(sub) => {
          setManualSub(sub);
          navigateTo(resolveStoreMenuGroupHref("cuidado-capilar", sub));
        }}
        activeSubcategory={manualSub}
      />

      {deferHeavy ? <BeautyAiAdvisor /> : null}

      {deferHeavy && tintItems.length > 0 ? <TintHomePreview items={tintItems} /> : null}

      <div className="marquee-strip marquee-strip--brand">
        <div className="marquee-track">
          {[...STOREFRONT_BRAND_MARQUEE_MESSAGES, ...STOREFRONT_BRAND_MARQUEE_MESSAGES].map((text, i) => (
            <span key={`brand-${text}-${i}`} className="marquee-item">
              {text}
            </span>
          ))}
        </div>
      </div>

      {deferHeavy ? <HomeCombosPromo combos={initialCombos} /> : null}

      <section className="section-pad" style={{ background: "var(--ivory)" }}>
        <div className="container reveal">
          <div className="promo-grid">
            <div
              className="promo-card"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(240, 228, 240, 0.62) 0%, rgba(197, 187, 218, 0.55) 100%), url(${homeContent?.promoWidgets.capilar || dulceRenacerCover.src})`,
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
                backgroundImage: `linear-gradient(135deg, rgba(255, 228, 220, 0.7) 0%, rgba(232, 180, 184, 0.55) 100%), url(${homeContent?.promoWidgets.corporal || dulceRenacerCover.src})`,
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
              <Link href={`/categoria/${categoryPath("Cuidado Corporal")}`} className="btn btn-primary btn-sm" prefetch>
                Explorar →
              </Link>
              <div className="promo-deco">✨</div>
            </div>
            <div
              className="promo-card"
              style={{
                backgroundImage: `linear-gradient(135deg, rgba(212, 232, 228, 0.58) 0%, rgba(168, 191, 187, 0.5) 100%), url(${homeContent?.promoWidgets.accesorios || accesoriosCover.src})`,
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
            {deferHeavy ? <PromoDiagonalTrio images={homeContent?.promoWidgets} /> : null}
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

          <div className={`products-grid${manualSub ? "" : " products-grid--club"}`} id="products-grid-main">
            {filteredProducts.slice(0, visibleCount).map((p, i) => (
              <StoreProductCard
                key={p.id}
                product={p}
                isFav={favorites.includes(p.id)}
                onOpen={openProductModal}
                onToggleFav={toggleFavorite}
                onAddCart={addToCart}
                imagePriority={i < 2}
              />
            ))}
          </div>

          {filteredProducts.length > visibleCount ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginTop: 40 }}>
              <button
                type="button"
                className="btn btn-outline btn-lg"
                onClick={() => setVisibleCount((c) => c + loadMoreStep)}
              >
                {manualSub ? "Ver más" : "Ver más favoritos"}
              </button>
              <span style={{ fontSize: 13, color: "var(--text-muted, #888)" }}>
                Mostrando {Math.min(visibleCount, filteredProducts.length)} de {filteredProducts.length} productos
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {deferHeavy ? <HomeTestimonials /> : null}

      <section className="newsletter-section">
        {deferHeavy ? <TechAmbient variant="subtle" /> : null}
        <div className="container newsletter-content reveal">
          <div className="section-eyebrow" style={{ color: "var(--blush)" }}>
            ¿Todavía no estás en el Club? 👀💗
          </div>
          <div className="newsletter-title">
            Esto te va a <em>interesar…</em>
          </div>
          <p className="newsletter-sub newsletter-sub--privileges">
            Ser Four Girl tiene sus privilegios
            <br />
            <strong>SIEMPRE TIENEN LAS PRIMICIAS💌</strong>
            <br />
            Lanzamientos, ediciones limitadas, sorpresas, secretos capilares y novedades que definitivamente vas a
            querer tener en el radar.
          </p>
          <p className="newsletter-sub" style={{ marginTop: 8 }}>
            Déjanos tu correo y entra al Club de los Cabellos Perfectos
          </p>
          <form className="newsletter-form newsletter-form--club" onSubmit={(e) => e.preventDefault()}>
            <input type="text" name="name" placeholder="Tu nombre" autoComplete="name" aria-label="Tu nombre" />
            <input type="tel" name="phone" placeholder="+57 celular" autoComplete="tel" aria-label="Celular" />
            <input type="email" name="email" placeholder="tu@correo.com" autoComplete="email" aria-label="Correo" />
            <button type="button" onClick={() => showToast("¡Bienvenida al Club! 💗", "success", "💌")}>
              Suscribirme
            </button>
          </form>
          <p className="newsletter-legal">
            Al registrarte aceptas recibir correos electrónicos de marketing y mensajes de texto
          </p>
        </div>
      </section>

      <StoreFooter />
    </>
  );
}
