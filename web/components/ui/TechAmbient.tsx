type TechAmbientProps = {
  /** hero = intenso; page = categorías/checkout; subtle = fondos suaves */
  variant?: "hero" | "page" | "subtle";
  className?: string;
};

/** Capa decorativa: orbes, grid y scanline (solo CSS, sin JS). */
export function TechAmbient({ variant = "page", className = "" }: TechAmbientProps) {
  return (
    <div className={`gb-tech-ambient gb-tech-ambient--${variant} ${className}`.trim()} aria-hidden>
      <div className="gb-tech-orb gb-tech-orb--a" />
      <div className="gb-tech-orb gb-tech-orb--b" />
      <div className="gb-tech-orb gb-tech-orb--c" />
      <div className="gb-tech-grid" />
      <div className="gb-tech-scanline" />
      <div className="gb-tech-particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="gb-tech-particle" style={{ ["--i" as string]: i }} />
        ))}
      </div>
    </div>
  );
}
