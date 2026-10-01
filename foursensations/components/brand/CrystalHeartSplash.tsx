"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import clubMark from "@/assets/foursensations/el-club-cabellos-perfectos.png";
import logoOnDark from "@/assets/foursensations/logo2.png";

const SPARKS = [
  { x: "8%", y: "14%", d: "0s" },
  { x: "22%", y: "78%", d: "0.4s" },
  { x: "36%", y: "22%", d: "0.9s" },
  { x: "48%", y: "88%", d: "0.2s" },
  { x: "62%", y: "16%", d: "1.1s" },
  { x: "74%", y: "72%", d: "0.55s" },
  { x: "88%", y: "28%", d: "0.75s" },
  { x: "14%", y: "48%", d: "1.3s" },
  { x: "92%", y: "58%", d: "0.15s" },
  { x: "58%", y: "42%", d: "1.5s" },
  { x: "30%", y: "62%", d: "0.65s" },
  { x: "80%", y: "86%", d: "1.05s" },
] as const;

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
          <Image
            src={logoOnDark}
            alt="Four Sensations"
            className="fs-heart-splash__logo"
            width={640}
            height={220}
            priority
          />
        </div>

        <span className="fs-heart-splash__rule" aria-hidden />

        <div className="fs-heart-splash__club-wrap">
          <Image
            src={clubMark}
            alt="El Club de los Cabellos Perfectos"
            className="fs-heart-splash__club"
            width={1200}
            height={720}
            priority
          />
        </div>

        {label && mode !== "intro" ? <p className="fs-heart-splash__label">{label}</p> : null}
      </div>
    </div>
  );
}
