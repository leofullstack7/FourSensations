'use client'

/**
 * TintShowcasePanel.tsx
 * ---------------------------------------------------------------
 * Panel derecho de la página de categoría Tintes. Muestra grande
 * la imagen PRINCIPAL del tinte activo (no la foto de color) y,
 * al seleccionar una burbuja, revela la ficha de compra con
 * crossfade + scale-in sutil (sin slides ni saltos).
 * ---------------------------------------------------------------
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import type { TintBubbleItem } from './TintBubbleField'

interface TintShowcasePanelProps {
  active: TintBubbleItem | null
  onAddToCart: (item: TintBubbleItem) => void
  formatPrice: (value: number) => string
}

export default function TintShowcasePanel({ active, onAddToCart, formatPrice }: TintShowcasePanelProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="tint-showcase">
      <div className="tint-showcase__frame">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={active.id}
              className="tint-showcase__media"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image
                src={active.mainImageUrl}
                alt={active.name}
                fill
                sizes="(min-width: 1024px) 480px, 100vw"
                className="tint-showcase__img"
                priority
              />
              <motion.span
                className="tint-showcase__halo-ring"
                aria-hidden="true"
                initial={{ opacity: 0.55, scale: 0.92 }}
                animate={{ opacity: 0, scale: 1.12 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              className="tint-showcase__placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="tint-showcase__placeholder-drop" aria-hidden="true" />
              <p>Elige un color para verlo en grande</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.id + '-card'}
            className="tint-showcase__card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <div className="tint-showcase__card-head">
              {active.family && <span className="tint-showcase__tag">{active.family}</span>}
              <h3>{active.name}</h3>
              <div className="tint-showcase__meta">
                {active.level && <span>Nivel {active.level}</span>}
                {active.type && <span>{active.type}</span>}
              </div>
            </div>
            <div className="tint-showcase__card-foot">
              <span className="tint-showcase__price">{formatPrice(active.price)}</span>
              <button
                type="button"
                className="tint-showcase__cta"
                onClick={() => onAddToCart(active)}
              >
                Agregar al carrito
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
