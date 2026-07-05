"use client";

import { MotionDiv } from "@/components/store/store-framer-motion";

const ITEMS = [
  {
    icon: "◈",
    title: "Curaduría IA",
    desc: "Sugerencias inteligentes según tu búsqueda y estilo.",
  },
  {
    icon: "⬡",
    title: "Checkout cifrado",
    desc: "Pagos seguros con ePayco y Bold en tiempo real.",
  },
  {
    icon: "◎",
    title: "Stock en vivo",
    desc: "Disponibilidad actualizada en cada visita.",
  },
  {
    icon: "✦",
    title: "Experiencia premium",
    desc: "Diseño fluido, rápido y 100% responsive.",
  },
] as const;

export function GinnaInnovationStrip() {
  return (
    <section className="gb-innovation-strip" aria-label="Tecnología GinnaBeauty">
      <div className="gb-innovation-strip-track">
        {[...ITEMS, ...ITEMS].map((item, idx) => (
          <MotionDiv
            key={`${item.title}-${idx}`}
            className="gb-innovation-card"
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
          >
            <span className="gb-innovation-icon" aria-hidden>
              {item.icon}
            </span>
            <div>
              <div className="gb-innovation-title">{item.title}</div>
              <div className="gb-innovation-desc">{item.desc}</div>
            </div>
            <span className="gb-innovation-glow" aria-hidden />
          </MotionDiv>
        ))}
      </div>
    </section>
  );
}
