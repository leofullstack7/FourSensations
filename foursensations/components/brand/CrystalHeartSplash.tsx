"use client";

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
      className={`fs-heart-splash fs-heart-splash--photo fs-heart-splash--${mode}${exiting ? " is-out" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={aria}
    >
      <picture className="fs-heart-splash__bg">
        <source media="(max-width: 768px)" srcSet="/brand/loader/fondo-loader-movil.jpeg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/loader/fondo-loader-pc.jpeg" alt="" />
      </picture>
      <picture className="fs-heart-splash__art">
        <source media="(max-width: 768px)" srcSet="/brand/loader/contenido-loader-movil.png" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/loader/contenido-loader-pc.png" alt="Four Sensations" />
      </picture>
      {label && mode !== "intro" ? <p className="fs-heart-splash__label">{label}</p> : null}
    </div>
  );
}
