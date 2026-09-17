"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import heartMark from "@/assets/foursensations/corazon2.png";

const SPARKS = [
  { x: "18%", y: "22%", d: "0s" },
  { x: "78%", y: "18%", d: "0.35s" },
  { x: "88%", y: "48%", d: "0.7s" },
  { x: "12%", y: "58%", d: "0.15s" },
  { x: "72%", y: "78%", d: "1s" },
  { x: "28%", y: "82%", d: "0.5s" },
  { x: "50%", y: "12%", d: "0.9s" },
  { x: "8%", y: "36%", d: "1.2s" },
  { x: "92%", y: "70%", d: "0.25s" },
  { x: "42%", y: "88%", d: "1.4s" },
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
      ? "Four Sensations"
      : label
        ? `Cargando ${label}`
        : "Cargando Four Sensations";

  return (
    <div
      className={`fs-heart-splash${mode === "page" ? " fs-heart-splash--page" : ""}${exiting ? " is-out" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={aria}
    >
      <div className="fs-heart-splash__void" aria-hidden />
      <div className="fs-heart-splash__aurora" aria-hidden />
      <div className="fs-heart-splash__sparks" aria-hidden>
        {SPARKS.map((s) => (
          <span
            key={`${s.x}-${s.y}`}
            className="fs-heart-splash__spark"
            style={{ "--x": s.x, "--y": s.y, "--d": s.d } as CSSProperties}
          />
        ))}
      </div>

      <div className="fs-heart-splash__stage">
        <span className="fs-heart-splash__orbit fs-heart-splash__orbit--a" aria-hidden />
        <span className="fs-heart-splash__orbit fs-heart-splash__orbit--b" aria-hidden />
        <span className="fs-heart-splash__orbit fs-heart-splash__orbit--c" aria-hidden />
        <div className="fs-heart-splash__core">
          <span className="fs-heart-splash__bloom" aria-hidden />
          <div className="fs-heart-splash__heart-wrap">
            <Image
              src={heartMark}
              alt=""
              className="fs-heart-splash__heart"
              width={520}
              height={520}
              priority
            />
            <span className="fs-heart-splash__sheen" aria-hidden />
          </div>
          <span className="fs-heart-splash__diamond" aria-hidden />
        </div>
      </div>

      <div className="fs-heart-splash__copy">
        <p className="fs-heart-splash__wordmark">Four Sensations</p>
        <p className="fs-heart-splash__whisper">El Club de los Cabellos Perfectos</p>
        {label ? <p className="fs-heart-splash__label">{label}</p> : null}
      </div>
    </div>
  );
}
