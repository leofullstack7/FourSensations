"use client";

import type { CSSProperties } from "react";

const SPARKS = [
  { x: "10%", y: "16%", d: "0s" },
  { x: "24%", y: "78%", d: "0.35s" },
  { x: "48%", y: "12%", d: "0.7s" },
  { x: "72%", y: "74%", d: "0.2s" },
  { x: "88%", y: "28%", d: "0.55s" },
  { x: "16%", y: "48%", d: "0.9s" },
  { x: "84%", y: "58%", d: "0.15s" },
  { x: "58%", y: "86%", d: "1s" },
] as const;

/** Assets livianos en /public (sin pasar por el optimizador de Next). */
const LOGO_SRC = "/brand/splash/logo-fs.webp";
const CLUB_SRC = "/brand/splash/el-club.webp";

type CrystalHeartSplashProps = {
  mode?: "intro" | "route" | "page";
  label?: string;
  exiting?: boolean;
};

export function CrystalHeartSplash({
  mode = "route",
  label,
  exiting = false,
}: CrystalHeartSplashProps) {
  const aria =
    mode === "intro"
      ? "Four Sensations — El Club de los Cabellos Perfectos"
      : label
        ? `Cargando ${label}`
        : "Cargando Four Sensations";

  return (
    <div
      className={`fs-heart-splash fs-heart-splash--${mode}${exiting ? " is-out" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={aria}
    >
      <div className="fs-heart-splash__void" aria-hidden />
      <div className="fs-heart-splash__glow fs-heart-splash__glow--a" aria-hidden />
      <div className="fs-heart-splash__glow fs-heart-splash__glow--b" aria-hidden />
      <div className="fs-heart-splash__veil" aria-hidden />
      <div className="fs-heart-splash__sparks" aria-hidden>
        {SPARKS.map((s) => (
          <span
            key={`${s.x}-${s.y}`}
            className="fs-heart-splash__spark"
            style={{ "--x": s.x, "--y": s.y, "--d": s.d } as CSSProperties}
          />
        ))}
      </div>

      <div className="fs-heart-splash__brand">
        <div className="fs-heart-splash__logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="Four Sensations" className="fs-heart-splash__logo" width={520} height={180} decoding="async" fetchPriority="high" />
        </div>

        <span className="fs-heart-splash__rule" aria-hidden />

        <div className="fs-heart-splash__club-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CLUB_SRC}
            alt="El Club de los Cabellos Perfectos"
            className="fs-heart-splash__club"
            width={900}
            height={540}
            decoding="async"
            fetchPriority="high"
          />
        </div>

        {label && mode !== "intro" ? <p className="fs-heart-splash__label">{label}</p> : null}
      </div>
    </div>
  );
}
