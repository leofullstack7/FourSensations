"use client";

import Link from "next/link";
import { MotionDiv, MotionH1, MotionP } from "@/components/store/legal-framer-motion";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

export type LegalPageSlug = "politicas-envio" | "terminos-condiciones" | "politicas-privacidad";

type LegalPageShellProps = {
  slug: LegalPageSlug;
  heroTitle: string;
  heroSubtitle: string;
  eyebrow?: string;
  children: ReactNode;
  footerNote?: string;
};

function useReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop;
      const height = el.scrollHeight - el.clientHeight;
      setP(height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}

function HeroParticles() {
  const seeds = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 23 + 7) % 100}%`,
        delay: `${(i % 7) * 0.4}s`,
        duration: `${10 + (i % 5)}s`,
      })),
    []
  );
  return (
    <div className="legal-hero__particles" aria-hidden>
      {seeds.map((s) => (
        <span
          key={s.id}
          className="legal-particle"
          style={{
            left: s.left,
            top: s.top,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  );
}

export function LegalRevealSection({
  number,
  title,
  variant = "light",
  children,
}: {
  number: number;
  title: string;
  variant?: "light" | "blush";
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true);
      },
      { root: null, threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="legal-section-divider" aria-hidden />
      <section
        ref={ref}
        className={`legal-section legal-section--${variant} ${visible ? "legal-reveal--visible" : ""}`}
      >
        <span className="legal-section-watermark" aria-hidden>
          {number}
        </span>
        <header className="legal-section-head">
          <h2 className="legal-section-title">{title}</h2>
        </header>
        <div className="legal-section-body">{children}</div>
      </section>
    </>
  );
}

export function LegalGlassCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <MotionDiv
      className="legal-glass-card"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
    >
      <div className="legal-glass-card__icon">{icon}</div>
      <div className="legal-glass-card__title">{title}</div>
      <div className="legal-glass-card__text">{children}</div>
    </MotionDiv>
  );
}

const FOOTER_LINKS: { href: string; label: string; slug: LegalPageSlug }[] = [
  { href: "/politicas-envio", label: "Políticas de envío", slug: "politicas-envio" },
  { href: "/terminos-condiciones", label: "Términos y condiciones", slug: "terminos-condiciones" },
  { href: "/politicas-privacidad", label: "Políticas de privacidad", slug: "politicas-privacidad" },
];

export function LegalPageShell({
  slug,
  heroTitle,
  heroSubtitle,
  eyebrow = "Four Sensations",
  children,
  footerNote,
}: LegalPageShellProps) {
  const progress = useReadingProgress();
  const labelId = useId();

  return (
    <div className="legal-page" aria-labelledby={labelId}>
      <div className="legal-read-progress" aria-hidden>
        <div className="legal-read-progress__bar" style={{ width: `${progress}%` }} />
      </div>

      <header className="legal-topbar">
        <Link href="/" className="legal-topbar__brand">
          Four Sensations
        </Link>
        <Link href="/" className="legal-topbar__link">
          ← Volver a la tienda
        </Link>
      </header>

      <div className="legal-hero">
        <div className="legal-hero__mesh" aria-hidden />
        <HeroParticles />
        <div className="legal-hero__inner">
          <p className="legal-hero__eyebrow">{eyebrow}</p>
          <MotionH1
            id={labelId}
            className="legal-hero__title"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            {heroTitle}
          </MotionH1>
          <MotionP
            className="legal-hero__subtitle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            {heroSubtitle}
          </MotionP>
        </div>
      </div>

      <main className="legal-main">{children}</main>

      <footer className="legal-page-footer">
        <div className="legal-page-footer__inner">
          <p className="legal-page-footer__label">Documentos legales</p>
          <nav className="legal-page-footer__links" aria-label="Enlaces legales">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} data-active={l.slug === slug ? "true" : undefined}>
                {l.label}
              </Link>
            ))}
          </nav>
          {footerNote ? <p className="legal-page-footer__meta">{footerNote}</p> : null}
        </div>
      </footer>
    </div>
  );
}
