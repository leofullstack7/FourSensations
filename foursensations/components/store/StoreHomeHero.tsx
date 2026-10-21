"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StaticImageData } from "next/image";
import heroPc1 from "@/assets/foursensations/banners/pc1.webp";
import heroPc2 from "@/assets/foursensations/banners/pc2.webp";
import heroPc3 from "@/assets/foursensations/banners/3.webp";
import heroPc4 from "@/assets/foursensations/banners/pc4.webp";
import heroMobile1 from "@/assets/foursensations/banners/movil1.webp";
import heroMobile2 from "@/assets/foursensations/banners/movil2.webp";
import heroMobile3 from "@/assets/foursensations/banners/movil3.webp";
import heroMobile4 from "@/assets/foursensations/banners/movil4.webp";

export const HERO_SLIDES: readonly {
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

/** Precarga LCP del primer slide (desktop + móvil con media). */
export function StoreHomeHeroPreload() {
  const first = HERO_SLIDES[0]!;
  return (
    <>
      <link
        rel="preload"
        as="image"
        href={first.desktop.src}
        type="image/webp"
        media="(min-width: 769px)"
        {...{ fetchPriority: "high" }}
      />
      <link
        rel="preload"
        as="image"
        href={first.mobile.src}
        type="image/webp"
        media="(max-width: 768px)"
        {...{ fetchPriority: "high" }}
      />
    </>
  );
}

export function StoreHomeHero() {
  const [heroBannerIndex, setHeroBannerIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroBannerIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  // Activo + siguiente (precarga del carrusel sin Sharp).
  const heroMountIndexes = useMemo(() => {
    const next = (heroBannerIndex + 1) % HERO_SLIDES.length;
    return next === heroBannerIndex ? [heroBannerIndex] : [heroBannerIndex, next];
  }, [heroBannerIndex]);

  // Precarga el siguiente slide en cuanto cambia el activo.
  useEffect(() => {
    const next = HERO_SLIDES[(heroBannerIndex + 1) % HERO_SLIDES.length]!;
    const warm = (src: string) => {
      const img = new window.Image();
      img.decoding = "async";
      img.src = src;
    };
    warm(next.desktop.src);
    warm(next.mobile.src);
  }, [heroBannerIndex]);

  return (
    <section className="hero-section" aria-label="Destacados Four Sensations">
      <div className="banner-placeholder-wrapper" id="hero-banner">
        {heroMountIndexes.map((index) => {
          const slide = HERO_SLIDES[index]!;
          const isActive = heroBannerIndex === index;
          const isLcp = index === 0 && heroBannerIndex === 0;
          return (
            <div
              key={slide.desktop.src}
              className={`hero-banner-layer${isActive ? " active" : ""}`}
            >
              {/* picture: el browser elige móvil/desktop sin esperar JS ni /_next/image. */}
              <picture>
                <source media="(max-width: 768px)" srcSet={slide.mobile.src} type="image/webp" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slide.desktop.src}
                  alt=""
                  className="hero-banner-kenburns"
                  width={slide.desktop.width}
                  height={slide.desktop.height}
                  decoding={isLcp || isActive ? "sync" : "async"}
                  loading={isLcp ? "eager" : "lazy"}
                  fetchPriority={isLcp ? "high" : "low"}
                  sizes="100vw"
                />
              </picture>
              {isActive ? (
                <Link href={slide.href} className="hero-banner-hit" prefetch aria-label={slide.alt} />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
