'use client'

/**
 * TintHomePreview.tsx
 * ---------------------------------------------------------------
 * Banda destacada en el HOME para la categoría Tintes.
 * Muestra un círculo grande por cada TIPO (ej. ROYAL, ZERO AMM),
 * usando la imagen PRINCIPAL de un tinte representativo de ese
 * tipo (el primero encontrado, o el que el admin marque como
 * destacado si existe ese campo más adelante).
 *
 * Filtro visible: solo Familia (chips). Al cambiar de familia,
 * se recalculan qué Tipos se muestran (los que tengan al menos
 * un tinte de esa familia).
 *
 * Clic en un Tipo -> navega a /categoria/tintes?tipo=<valor>
 * (la página de categoría lee ese query param y preselecciona).
 *
 * INTEGRACIÓN (Cursor):
 * - Insertar este componente en la home, como sección propia,
 *   en el mismo nivel que otras franjas de categoría destacada.
 * - `items` debe venir de la misma fuente de datos cacheada
 *   (unstable_cache) que ya se usa para productos de la tienda,
 *   filtrando categoría = tintes.
 * - Reusar <Link> de next/link (ya es el patrón del proyecto)
 *   en lugar de navegación manual si se prefiere.
 * ---------------------------------------------------------------
 */

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import type { TintBubbleItem } from './TintBubbleField'
import './tints.css'

interface TintHomePreviewProps {
  items: TintBubbleItem[]
  categoryHref?: string
}

interface TypeCard {
  type: string
  representative: TintBubbleItem
  count: number
}

export default function TintHomePreview({ items, categoryHref = '/categoria/tintes' }: TintHomePreviewProps) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [activeFamily, setActiveFamily] = useState<string | null>(null)

  const families = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => i.family && set.add(i.family))
    return Array.from(set)
  }, [items])

  const typeCards: TypeCard[] = useMemo(() => {
    const filtered = activeFamily ? items.filter((i) => i.family === activeFamily) : items
    const map = new Map<string, TypeCard>()
    for (const item of filtered) {
      if (!item.type) continue
      const existing = map.get(item.type)
      if (existing) {
        existing.count += 1
      } else {
        map.set(item.type, { type: item.type, representative: item, count: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [items, activeFamily])

  if (!items.length) return null

  return (
    <section className="tint-home-preview">
      <div className="tint-home-preview__head">
        <div>
          <span className="tint-home-preview__eyebrow">Color que se nota</span>
          <h2>Tintes</h2>
        </div>
        <a href={categoryHref} className="tint-home-preview__see-all">
          Ver toda la colección →
        </a>
      </div>

      {families.length > 1 && (
        <div className="tint-home-preview__families">
          <button
            type="button"
            className={`tint-chip${activeFamily === null ? ' tint-chip--active' : ''}`}
            onClick={() => setActiveFamily(null)}
          >
            Todas las familias
          </button>
          {families.map((f) => (
            <button
              key={f}
              type="button"
              className={`tint-chip${activeFamily === f ? ' tint-chip--active' : ''}`}
              onClick={() => setActiveFamily(f)}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="tint-home-preview__track">
        {typeCards.map((card, i) => (
          <motion.button
            key={card.type}
            type="button"
            className="tint-type-card"
            onClick={() => router.push(`${categoryHref}?tipo=${encodeURIComponent(card.type)}`)}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: reduceMotion ? 0 : Math.min(i * 0.05, 0.3) }}
            whileHover={reduceMotion ? {} : { y: -6, transition: { duration: 0.25 } }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="tint-type-card__img-wrap">
              <Image
                src={card.representative.mainImageUrl}
                alt={card.type}
                fill
                sizes="160px"
                className="tint-type-card__img"
              />
              <span className="tint-type-card__ring" aria-hidden="true" />
            </span>
            <span className="tint-type-card__label">{card.type}</span>
            <span className="tint-type-card__count">{card.count} tonos</span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}
