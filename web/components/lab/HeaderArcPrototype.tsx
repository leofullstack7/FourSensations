"use client";

import Image from "next/image";
import Link from "next/link";
import logoWide from "@/assets/logo-largo.png";
import { LabArcMagicAura } from "@/components/lab/LabArcMagicAura";
import { LabStoreHeaderIcons } from "@/components/lab/LabStoreHeaderIcons";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { STOREFRONT_TOPBAR_MESSAGES } from "@/lib/store-topbar-messages";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

type ArcCat = {
  id: string;
  label: string;
  lines: string[];
  img: string;
  icon: string;
};

/** 9 segmentos como la referencia visual (lab). Imágenes locales cuando existen. */
const CATS: ArcCat[] = [
  {
    id: "maquillaje",
    label: "Maquillaje",
    lines: ["Maquillaje"],
    img: "/categorias/maquillaje-rosado.webp",
    icon: "💄",
  },
  {
    id: "cuidado-piel",
    label: "Cuidado piel",
    lines: ["Cuidado", "piel"],
    img: "/categorias/cuidado-piel-cafe.webp",
    icon: "✨",
  },
  {
    id: "cuidado-capilar",
    label: "Cuidado capilar",
    lines: ["Cuidado", "capilar"],
    img: "/categorias/cuidado-capilar-rosado.webp",
    icon: "💇",
  },
  {
    id: "unas",
    label: "Uñas",
    lines: ["Uñas"],
    img: "/categorias/unas-cafe.webp",
    icon: "💅",
  },
  {
    id: "hombres",
    label: "Hombres",
    lines: ["Hombres"],
    img: "/categorias/hombres-cafe.webp",
    icon: "🧔",
  },
  {
    id: "accesorios",
    label: "Accesorios",
    lines: ["Accesorios"],
    img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&q=65",
    icon: "👜",
  },
  {
    id: "styling",
    label: "Styling",
    lines: ["Styling"],
    img: "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=500&q=65",
    icon: "🪞",
  },
  {
    id: "tintes",
    label: "Tintes",
    lines: ["Tintes"],
    img: "/categorias/tintes-rosado.webp",
    icon: "🎨",
  },
  {
    id: "kits",
    label: "Kits & Regalos",
    lines: ["Kits &", "Regalos"],
    img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=500&q=65",
    icon: "🎁",
  },
];

const LAB_DEMO_CARDS = [
  { title: "Card producto (lab)", tone: "Vista de referencia", price: "—", badge: null as string | null },
  { title: "Card producto (lab)", tone: "Imagen / precio reales en tienda", price: "—", badge: "Nuevo" },
  { title: "Card producto (lab)", tone: "Solo composición visual", price: "—", badge: null },
] as const;

const TINTS = ["a", "b", "c"] as const;

type Pt = { x: number; y: number };

function bezier(t: number, p0: Pt, p1: Pt, p2: Pt): Pt {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * t * u * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * t * u * p1.y + t * t * p2.y,
  };
}

function tangent(t: number, p0: Pt, p1: Pt, p2: Pt): Pt {
  return {
    x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
  };
}

function upwardNormal(t: number, p0: Pt, p1: Pt, p2: Pt): Pt {
  const d = tangent(t, p0, p1, p2);
  const len = Math.hypot(d.x, d.y) || 1;
  let nx = -d.y / len;
  let ny = d.x / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: nx, y: ny };
}

function sampleArc(p0: Pt, p1: Pt, p2: Pt, t0: number, t1: number, steps = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    out.push(bezier(t, p0, p1, p2));
  }
  return out;
}

function offsetPoint(t: number, p0: Pt, p1: Pt, p2: Pt, dist: number): Pt {
  const b = bezier(t, p0, p1, p2);
  const n = upwardNormal(t, p0, p1, p2);
  return { x: b.x + n.x * dist, y: b.y + n.y * dist };
}

function sampleOffsetArc(
  p0: Pt,
  p1: Pt,
  p2: Pt,
  t0: number,
  t1: number,
  dist: number,
  steps = 16,
): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    out.push(offsetPoint(t, p0, p1, p2, dist));
  }
  return out;
}

function pathFromPoints(pts: Pt[], close = false): string {
  if (pts.length === 0) return "";
  const [first, ...rest] = pts;
  let d = `M ${first!.x.toFixed(2)} ${first!.y.toFixed(2)}`;
  for (const p of rest) d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  if (close) d += " Z";
  return d;
}

function parallelGuidePath(width: number, height: number, uniform: boolean, band: number): string {
  const topPad = uniform ? 14 : 40;
  const p0 = { x: 0, y: height - 4 };
  const p1 = { x: width / 2, y: topPad };
  const p2 = { x: width, y: height - 4 };
  const pts = sampleOffsetArc(p0, p1, p2, 0.002, 0.998, band, 48);
  return pathFromPoints(pts, false);
}

type SegmentGeom = {
  id: string;
  path: string;
  labelX: number;
  labelY: number;
  labelAngle: number;
  lines: string[];
  label: string;
  icon: string;
  tint: (typeof TINTS)[number];
};

function buildSegments(width: number, height: number, uniform: boolean): SegmentGeom[] {
  const n = CATS.length;
  const topPad = uniform ? 14 : 40;
  const p0 = { x: 0, y: height - 4 };
  const p1 = { x: width / 2, y: topPad };
  const p2 = { x: width, y: height - 4 };
  const tMin = 0.002;
  const tMax = 0.998;
  const band = uniform
    ? Math.min(76, height * 0.56)
    : Math.min(136, Math.max(108, height - topPad - 24));
  const steps = 18;
  const segs: SegmentGeom[] = [];
  for (let i = 0; i < n; i++) {
    const tA = tMin + (i / n) * (tMax - tMin);
    const tB = tMin + ((i + 1) / n) * (tMax - tMin);
    const tMid = (tA + tB) / 2;
    const bottom = sampleArc(p0, p1, p2, tA, tB, steps);
    const top = sampleOffsetArc(p0, p1, p2, tB, tA, band, steps);
    const labelPt = offsetPoint(tMid, p0, p1, p2, band * 0.5);
    const ang = (Math.atan2(tangent(tMid, p0, p1, p2).y, tangent(tMid, p0, p1, p2).x) * 180) / Math.PI;
    const cat = CATS[i]!;
    segs.push({
      id: cat.id,
      path: pathFromPoints([...bottom, ...top], true),
      labelX: labelPt.x,
      labelY: labelPt.y,
      labelAngle: ang,
      lines: cat.lines,
      label: cat.label,
      icon: cat.icon,
      tint: TINTS[i % TINTS.length]!,
    });
  }
  return segs;
}

function guidePath(width: number, height: number, uniform: boolean): string {
  const topPad = uniform ? 14 : 40;
  return `M 0 ${height - 4} Q ${width / 2} ${topPad} ${width} ${height - 4}`;
}

function bandForState(height: number, uniform: boolean): number {
  const topPad = uniform ? 14 : 40;
  return uniform
    ? Math.min(76, height * 0.56)
    : Math.min(136, Math.max(108, height - topPad - 24));
}

const ARC_H = 280;
/** Rango de scroll donde el arco se desvanece y aparece el menú plano. */
const FLAT_FADE_START = 12;
const FLAT_FADE_END = 150;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function HeaderArcPrototype({ children }: { children?: ReactNode }) {
  const { openSearch } = useStorefrontUi();
  const shellRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1400);
  const [shellH, setShellH] = useState(360);
  /** 0 = arco visible; 1 = menú plano a pantalla completa. */
  const [navProgress, setNavProgress] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flatActiveId, setFlatActiveId] = useState<string | null>(null);
  const [topbarIndex, setTopbarIndex] = useState(0);

  const scrollToBanner = useCallback(() => {
    document.getElementById("hero-banner")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const measureArc = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(Math.max(el.clientWidth, window.innerWidth));
  }, []);

  const measureShell = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    setShellH(el.offsetHeight);
  }, []);

  useLayoutEffect(() => {
    measureArc();
    measureShell();
  }, [measureArc, measureShell, activeId]);

  useEffect(() => {
    const onResize = () => {
      measureArc();
      measureShell();
    };
    window.addEventListener("resize", onResize);
    const el = wrapRef.current;
    const ro = el ? new ResizeObserver(onResize) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [measureArc, measureShell]);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      if (y <= 0) {
        setNavProgress(0);
        return;
      }
      const raw = Math.min(1, Math.max(0, (y - FLAT_FADE_START) / (FLAT_FADE_END - FLAT_FADE_START)));
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setNavProgress(reduce ? (raw >= 0.5 ? 1 : 0) : easeInOutCubic(raw));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTopbarIndex((i) => (i + 1) % STOREFRONT_TOPBAR_MESSAGES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const segments = useMemo(() => buildSegments(width, ARC_H, false), [width]);
  const guide = useMemo(() => guidePath(width, ARC_H, false), [width]);
  const band = useMemo(() => bandForState(ARC_H, false), []);
  const topGuide = useMemo(
    () => parallelGuidePath(width, ARC_H, false, band),
    [width, band],
  );

  const arcOpacity = 1 - navProgress;
  const flatOpacity = navProgress;
  const roseVeil = Math.sin(navProgress * Math.PI) * 0.55;
  const showFlat = navProgress > 0.02;
  const flatInteractive = navProgress > 0.45;
  const arcInteractive = navProgress < 0.55;

  return (
    <div
      className={`gb-arc-lab${navProgress > 0.08 ? " is-scrolled" : ""}${navProgress > 0.85 ? " is-flat" : ""}`}
      style={
        {
          "--gb-arc-progress": String(navProgress),
          "--gb-arc-veil": String(roseVeil),
        } as CSSProperties
      }
    >
      <div className="gb-arc-lab__fondo" aria-hidden>
        {/* full-width, altura proporcional: no deformar el arte */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fondo-ginna.png" alt="" width={1920} height={1080} decoding="async" />
      </div>

      {/* Velo rosado durante el crossfade arco ↔ menú plano */}
      <div className="gb-arc-lab__rose-veil" aria-hidden />

      <LabArcMagicAura />

      {/* Menú plano duplicado (edge-to-edge) — aparece al hacer scroll */}
      <nav
        className="gb-arc-lab__flat"
        style={{
          opacity: flatOpacity,
          pointerEvents: flatInteractive ? "auto" : "none",
        }}
        aria-hidden={!showFlat}
        aria-label="Menú de categorías"
      >
        <Link href="/" className="gb-arc-lab__flat-logo" tabIndex={flatInteractive ? 0 : -1}>
          <span className="gb-arc-lab__flat-logo-mark">
            <Image src={logoWide} alt="GinnaBeauty" width={200} height={60} />
          </span>
        </Link>
        <ul className="gb-arc-lab__flat-menu">
          {CATS.map((c) => (
            <li key={`flat-${c.id}`}>
              <button
                type="button"
                className={`gb-arc-lab__flat-link${flatActiveId === c.id ? " is-active" : ""}`}
                tabIndex={flatInteractive ? 0 : -1}
                onMouseEnter={() => setFlatActiveId(c.id)}
                onFocus={() => setFlatActiveId(c.id)}
                onMouseLeave={() => setFlatActiveId(null)}
                onBlur={() => setFlatActiveId(null)}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="gb-arc-lab__flat-utils">
          <LabStoreHeaderIcons larger />
        </div>
      </nav>

      <header
        ref={shellRef}
        className="gb-arc-lab__shell"
        style={{
          opacity: arcOpacity,
          pointerEvents: arcInteractive ? "auto" : "none",
        }}
        aria-hidden={navProgress > 0.9}
      >
        <div className="gb-arc-lab__ann" aria-live="polite">
          {STOREFRONT_TOPBAR_MESSAGES[topbarIndex]}
        </div>

        <div className="gb-arc-lab__top">
          <Link href="/" className="gb-arc-lab__logo" tabIndex={arcInteractive ? 0 : -1}>
            <span className="gb-arc-lab__logo-mark gb-arc-lab__logo-mark--wide">
              <Image src={logoWide} alt="GinnaBeauty" width={240} height={72} priority />
            </span>
          </Link>
          <div className="gb-arc-lab__search" role="search">
            <span aria-hidden>⌕</span>
            <input
              type="search"
              placeholder="Buscar productos..."
              readOnly
              onClick={openSearch}
              onFocus={openSearch}
            />
          </div>
          <LabStoreHeaderIcons larger />
        </div>

        <div
          ref={wrapRef}
          className="gb-arc-lab__arc"
          style={{ height: ARC_H }}
          onMouseLeave={() => setActiveId(null)}
        >
          <svg
            className="gb-arc-lab__svg"
            viewBox={`0 0 ${width} ${ARC_H}`}
            width="100%"
            height={ARC_H}
            preserveAspectRatio="none"
            role="navigation"
            aria-label="Categorías en arco (prototipo)"
          >
            <defs>
              <linearGradient id="gb-arc-tint-a" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#C4547A" stopOpacity="0.55" />
                <stop offset="55%" stopColor="#8B2F52" stopOpacity="0.72" />
                <stop offset="100%" stopColor="#4A2E1A" stopOpacity="0.88" />
              </linearGradient>
              <linearGradient id="gb-arc-tint-b" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#A84D6A" stopOpacity="0.55" />
                <stop offset="50%" stopColor="#6B3048" stopOpacity="0.74" />
                <stop offset="100%" stopColor="#3D2518" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="gb-arc-tint-c" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#B86B7E" stopOpacity="0.52" />
                <stop offset="45%" stopColor="#8B2F52" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#4A2E1A" stopOpacity="0.88" />
              </linearGradient>
              <linearGradient id="gb-arc-guide" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C9A227" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#E8D5A3" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#C9A227" stopOpacity="0.35" />
              </linearGradient>
              {CATS.map((c) => (
                <pattern
                  key={`pat-${c.id}`}
                  id={`gb-arc-img-${c.id}`}
                  patternContentUnits="objectBoundingBox"
                  width="1"
                  height="1"
                >
                  <image
                    href={c.img}
                    x="0"
                    y="0"
                    width="1"
                    height="1"
                    preserveAspectRatio="xMidYMid slice"
                  />
                </pattern>
              ))}
            </defs>

            {segments.map((s) => {
              const lineH = 15;
              const startY = -((s.lines.length - 1) * lineH) / 2;
              return (
                <g
                  key={s.id}
                  className={`gb-arc-lab__seg${activeId === s.id ? " is-active" : ""}`}
                  onMouseEnter={() => setActiveId(s.id)}
                >
                  <title>{s.label}</title>
                  <path d={s.path} fill={`url(#gb-arc-img-${s.id})`} className="gb-arc-lab__wedge" />
                  <path d={s.path} fill={`url(#gb-arc-tint-${s.tint})`} className="gb-arc-lab__wedge-tint" />
                  <path d={s.path} fill="none" stroke="rgba(232,213,163,0.35)" strokeWidth={1} />
                  <text
                    transform={`translate(${s.labelX}, ${s.labelY}) rotate(${s.labelAngle})`}
                    textAnchor="middle"
                    className="gb-arc-lab__caption"
                    style={{ pointerEvents: "none" }}
                  >
                    {s.lines.map((line, li) => (
                      <tspan key={`${s.id}-${li}`} x={0} y={startY + li * lineH}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}

            <path d={guide} fill="none" stroke="url(#gb-arc-guide)" strokeWidth={1.6} />
            <path d={topGuide} fill="none" stroke="url(#gb-arc-guide)" strokeWidth={1.6} />
          </svg>
        </div>

        {activeId ? (
          <div className="gb-arc-lab__mega" role="status">
            <div className="gb-arc-lab__mega-bar" />
            <p>
              Mega menú de ejemplo: <strong>{CATS.find((c) => c.id === activeId)?.label}</strong>
              <span> — solo prototipo (en tienda usa el menú real).</span>
            </p>
          </div>
        ) : null}
      </header>

      <div className="gb-arc-lab__spacer" style={{ height: shellH }} aria-hidden />

      <div className="gb-arc-lab__compare-bar">
        <span>
          Laboratorio A/B · interfaz con arco — el home actual sigue en{" "}
          <Link href="/">/</Link>
        </span>
        <Link href="/" className="gb-arc-lab__back">
          Ver home actual →
        </Link>
      </div>

      <main className="gb-arc-lab__main">
        <section className="gb-arc-lab__hero" aria-label="Hero editorial (prototipo)">
          <div className="gb-arc-lab__hero-mark">
            <Image src={logoWide} alt="GinnaBeauty" width={220} height={72} />
          </div>
          <p className="gb-arc-lab__hero-brand">GinnaBeauty</p>
          <p className="gb-arc-lab__hero-sub">Cosmética Premium</p>
          <h1 className="gb-arc-lab__hero-title">
            Tu belleza, <em>sin límites</em>
          </h1>
          <p className="gb-arc-lab__hero-lead">
            Descubre cosméticos premium, cuidado de piel y capilar curados con amor para realzar tu brillo
            natural.
          </p>
          <div className="gb-arc-lab__hero-ctas">
            <button type="button" className="gb-arc-lab__btn gb-arc-lab__btn--primary" onClick={scrollToBanner}>
              Ver productos →
            </button>
            <button type="button" className="gb-arc-lab__btn gb-arc-lab__btn--outline" onClick={openSearch}>
              Buscar mi producto →
            </button>
          </div>
        </section>

        <section className="gb-arc-lab__trust" aria-label="Beneficios">
          <div className="gb-arc-lab__trust-item">
            <span aria-hidden>🚚</span>
            <div>
              <strong>Envío a toda Colombia</strong>
              <small>Gratis en compras superiores a $130.000</small>
            </div>
          </div>
          <div className="gb-arc-lab__trust-item">
            <span aria-hidden>🔄</span>
            <div>
              <strong>Devoluciones 7 días</strong>
              <small>Satisfacción o te devolvemos</small>
            </div>
          </div>
          <div className="gb-arc-lab__trust-item">
            <span aria-hidden>✅</span>
            <div>
              <strong>Productos originales</strong>
              <small>100% auténticos y certificados</small>
            </div>
          </div>
        </section>

        <div className="gb-arc-lab__wave" aria-hidden />

        <section className="gb-arc-lab__featured" aria-label="Destacados (prototipo visual)">
          <h2 className="gb-arc-lab__featured-title">
            <span aria-hidden>✦</span> Destacados <em>para ti</em> <span aria-hidden>✦</span>
          </h2>
          <p className="gb-arc-lab__featured-sub">
            Composición del laboratorio. Debajo continúa el banner y el catálogo real de la tienda.
          </p>
          <div className="gb-arc-lab__cards">
            {LAB_DEMO_CARDS.map((card, i) => (
              <article key={`lab-card-${i}`} className="gb-arc-lab__card">
                {card.badge ? <span className="gb-arc-lab__card-badge">{card.badge}</span> : null}
                <button type="button" className="gb-arc-lab__card-heart" tabIndex={-1} aria-hidden>
                  ♡
                </button>
                <div
                  className="gb-arc-lab__card-img"
                  style={{ backgroundImage: `url(${CATS[i % CATS.length]!.img})` }}
                />
                <div className="gb-arc-lab__card-body">
                  <h3>{card.title}</h3>
                  <p>{card.tone}</p>
                  <div className="gb-arc-lab__card-meta">
                    <strong>{card.price}</strong>
                    <span className="gb-arc-lab__card-cart" aria-hidden>
                      🛒
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <div className="gb-arc-lab__home-body">{children}</div>
    </div>
  );
}
