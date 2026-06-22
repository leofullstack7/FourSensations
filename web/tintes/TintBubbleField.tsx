'use client'

/**
 * TintBubbleField.tsx
 * ---------------------------------------------------------------
 * Signature element de la sección Tintes: burbujas de color que
 * flotan como gotas de tinte en suspensión. Reutilizable tanto en
 * la página de categoría completa como en el preview del home.
 *
 * Cada burbuja representa UN tinte (color real / foto en cabello).
 * Al pasar el mouse "tensa" la gota; al hacer clic dispara
 * onSelect(tint) para que el padre actualice el panel/imagen grande.
 *
 * Respeta prefers-reduced-motion: desactiva drift e idle pulse.
 * ---------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export interface TintBubbleItem {
  id: string
  name: string          // DETALLE -> nombre del tinte (ya en mayúsculas)
  colorImageUrl: string  // foto real del resultado en cabello
  mainImageUrl: string   // imagen principal del producto (para el panel grande)
  level?: string | null
  group?: string | null
  family?: string | null
  type?: string | null
  price: number
  slug: string
}

interface TintBubbleFieldProps {
  items: TintBubbleItem[]
  selectedId?: string | null
  onSelect: (item: TintBubbleItem) => void
  size?: 'sm' | 'md' | 'lg'
  emptyLabel?: string
}

const SIZE_MAP = {
  sm: { px: 64, gap: 14 },
  md: { px: 84, gap: 18 },
  lg: { px: 104, gap: 22 },
}

// Drift determinístico por id (evita Math.random en cada render -> sin hydration mismatch)
function driftSeed(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  const dur = 6 + (h % 30) / 10 // 6s - 9s
  const delay = (h % 17) / 10   // 0 - 1.6s
  const dy = 3 + (h % 5)        // 3 - 7px
  return { dur, delay, dy }
}

export default function TintBubbleField({
  items,
  selectedId,
  onSelect,
  size = 'md',
  emptyLabel = 'No encontramos tintes con esos filtros. Prueba ajustando el grupo o la familia.',
}: TintBubbleFieldProps) {
  const reduceMotion = useReducedMotion()
  const dims = SIZE_MAP[size]

  if (!items.length) {
    return (
      <div className="tint-bubbles-empty" role="status">
        <span className="tint-bubbles-empty__drop" aria-hidden="true" />
        <p>{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div
      className="tint-bubbles-field"
      style={{ '--bubble-size': `${dims.px}px`, '--bubble-gap': `${dims.gap}px` } as React.CSSProperties}
      role="listbox"
      aria-label="Colores de tinte disponibles"
    >
      {items.map((item, i) => {
        const { dur, delay, dy } = driftSeed(item.id)
        const isActive = selectedId === item.id

        return (
          <motion.button
            key={item.id}
            type="button"
            role="option"
            aria-selected={isActive}
            aria-label={`${item.name}${item.level ? `, nivel ${item.level}` : ''}`}
            className={`tint-bubble${isActive ? ' tint-bubble--active' : ''}`}
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
                      repeatType: 'mirror',
                      ease: 'easeInOut',
                    },
                  }
            }
            whileHover={
              reduceMotion
                ? { opacity: 0.92 }
                : { scale: 1.08, scaleY: 1.05, transition: { duration: 0.25, ease: 'easeOut' } }
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
        )
      })}
    </div>
  )
}
