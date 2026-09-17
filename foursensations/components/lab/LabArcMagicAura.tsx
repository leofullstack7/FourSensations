"use client";

/** Partículas de magia / luz a baja opacidad (lados izquierdo y derecho). */
export function LabArcMagicAura() {
  const left = ["✦", "✧", "·", "✦", "✧", "·", "✦", "✧"];
  const right = ["✧", "✦", "·", "✧", "✦", "·", "✧", "✦"];

  return (
    <div className="gb-arc-lab__magic" aria-hidden>
      <div className="gb-arc-lab__magic-side gb-arc-lab__magic-side--left">
        {left.map((ch, i) => (
          <span
            key={`m-l-${i}`}
            className="gb-arc-lab__spark"
            style={{
              top: `${8 + i * 11}%`,
              left: `${12 + (i % 3) * 18}%`,
              animationDelay: `${i * 0.55}s`,
              animationDuration: `${5.5 + (i % 4) * 0.8}s`,
              fontSize: `${10 + (i % 3) * 4}px`,
            }}
          >
            {ch}
          </span>
        ))}
        <div className="gb-arc-lab__magic-glow" />
      </div>
      <div className="gb-arc-lab__magic-side gb-arc-lab__magic-side--right">
        {right.map((ch, i) => (
          <span
            key={`m-r-${i}`}
            className="gb-arc-lab__spark"
            style={{
              top: `${10 + i * 11}%`,
              right: `${10 + (i % 3) * 18}%`,
              animationDelay: `${0.3 + i * 0.5}s`,
              animationDuration: `${5.2 + (i % 4) * 0.85}s`,
              fontSize: `${10 + (i % 3) * 4}px`,
            }}
          >
            {ch}
          </span>
        ))}
        <div className="gb-arc-lab__magic-glow" />
      </div>
    </div>
  );
}
