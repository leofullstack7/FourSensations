"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { TintBubbleItem } from "@/lib/tints";

interface TintBubbleFieldProps {
  items: TintBubbleItem[];
  selectedId?: string | null;
  onSelect: (item: TintBubbleItem) => void;
  size?: "sm" | "md" | "lg";
  emptyLabel?: string;
}

const SIZE_MAP = {
  sm: { px: 64, gap: 14 },
  md: { px: 84, gap: 18 },
  lg: { px: 104, gap: 22 },
};

function driftSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const dur = 6 + (h % 30) / 10;
  const delay = (h % 17) / 10;
  const dy = 3 + (h % 5);
  return { dur, delay, dy };
}

export function TintBubbleField({
  items,
  selectedId,
  onSelect,
  size = "md",
  emptyLabel = "No encontramos tintes con esos filtros. Prueba ajustando el grupo o la familia.",
}: TintBubbleFieldProps) {
  const reduceMotion = useReducedMotion();
  const dims = SIZE_MAP[size];

  if (!items.length) {
    return (
      <div className="tint-bubbles-empty" role="status">
        <span className="tint-bubbles-empty__drop" aria-hidden="true" />
        <p>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div
      className="tint-bubbles-field"
      style={{ "--bubble-size": `${dims.px}px`, "--bubble-gap": `${dims.gap}px` } as React.CSSProperties}
      role="listbox"
      aria-label="Colores de tinte disponibles"
    >
      {items.map((item, i) => {
        const { dur, delay, dy } = driftSeed(item.id);
        const isActive = selectedId === item.id;

        return (
          <motion.button
            key={item.id}
            type="button"
            role="option"
            aria-selected={isActive}
            aria-label={`${item.name}${item.level ? `, nivel ${item.level}` : ""}`}
            className={`tint-bubble${isActive ? " tint-bubble--active" : ""}`}
            onClick={() => onSelect(item)}
            initial={{ opacity: 0, y: 18, scale: 0.85 }}
            animate={
              reduceMotion
                ? { opacity: 1, y: 0, scale: 1 }
                : {
                    opacity: 1,
                    scale: 1,
                    y: [0, -dy, 0],
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0.25, delay: Math.min(i * 0.02, 0.4) }
                : {
                    opacity: { duration: 0.45, delay: Math.min(i * 0.03, 0.6) },
                    scale: { duration: 0.45, delay: Math.min(i * 0.03, 0.6) },
                    y: {
                      duration: dur,
                      delay,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                    },
                  }
            }
            whileHover={
              reduceMotion
                ? { opacity: 0.92 }
                : { scale: 1.08, scaleY: 1.05, transition: { duration: 0.25, ease: "easeOut" } }
            }
            whileTap={{ scale: 0.95 }}
          >
            <span className="tint-bubble__halo" aria-hidden="true" />
            <span className="tint-bubble__img-wrap">
              <Image
                src={item.colorImageUrl}
                alt=""
                fill
                sizes={`${dims.px}px`}
                className="tint-bubble__img"
              />
            </span>
            {item.level && <span className="tint-bubble__level">{item.level}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}
