'use client'

/**
 * TintCategoryPageClient.tsx
 * ---------------------------------------------------------------
 * Página de categoría para Tintes (/categoria/tintes).
 * Estructura: filtros arriba (Grupo destacado + secundarios),
 * dos columnas debajo: burbujas de color a la izquierda, panel
 * de imagen grande + ficha de compra a la derecha.
 *
 * Lee ?tipo=<slug> en la URL al montar (llega desde el preview
 * del home) y preselecciona ese filtro automáticamente.
 *
 * INTEGRACIÓN (Cursor):
 * - Sustituir `useTintCatalog` por el fetch real a la API de
 *   productos filtrados por categoría "tintes" (ya existente:
 *   GET /api/store/products?category=tintes o equivalente).
 *   El shape esperado de cada producto es TintBubbleItem.
 * - `addToCart` debe llamar la función real del carrito ya usada
 *   en StoreHomeClient (mismo patrón, no duplicar lógica de carrito).
 * - formatPrice debe reusar el helper de formato COP ya existente
 *   en el proyecto en lugar del Intl.NumberFormat local de abajo.
 * ---------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import TintFilterBar, { type TintFilterOption } from './TintFilterBar'
import TintBubbleField, { type TintBubbleItem } from './TintBubbleField'
import TintShowcasePanel from './TintShowcasePanel'
import './tints.css'

interface TintCategoryPageClientProps {
  initialItems: TintBubbleItem[]
  addToCart: (item: TintBubbleItem) => void
}

const formatPriceCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

function buildOptions(items: TintBubbleItem[], key: keyof TintBubbleItem): TintFilterOption[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const raw = item[key]
    if (!raw) continue
    const value = String(raw)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }))
}

export default function TintCategoryPageClient({ initialItems, addToCart }: TintCategoryPageClientProps) {
  const searchParams = useSearchParams()

  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const [activeFamily, setActiveFamily] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<string | null>(null)
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<TintBubbleItem | null>(null)

  // Preselecciona el filtro Tipo si llega ?tipo= desde el preview del home
  useEffect(() => {
    const tipoParam = searchParams?.get('tipo')
    if (tipoParam) setActiveType(tipoParam)
  }, [searchParams])

  const groups = useMemo(() => buildOptions(initialItems, 'group'), [initialItems])
  const families = useMemo(() => buildOptions(initialItems, 'family'), [initialItems])
  const types = useMemo(() => buildOptions(initialItems, 'type'), [initialItems])
  // subcategoría no viene en TintBubbleItem por defecto: Cursor debe extenderlo si aplica
  const subcategories: TintFilterOption[] = []

  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      if (activeGroup && item.group !== activeGroup) return false
      if (activeFamily && item.family !== activeFamily) return false
      if (activeType && item.type !== activeType) return false
      return true
    })
  }, [initialItems, activeGroup, activeFamily, activeType])

  // Si el item seleccionado ya no está en el filtro activo, lo deseleccionamos
  useEffect(() => {
    if (selected && !filteredItems.some((i) => i.id === selected.id)) {
      setSelected(null)
    }
  }, [filteredItems, selected])

  // Por defecto, al cambiar filtros, mostramos el primer tinte del grupo activo (según lo confirmado)
  useEffect(() => {
    if (!selected && filteredItems.length > 0) {
      setSelected(filteredItems[0])
    }
  }, [filteredItems, selected])

  return (
    <section className="tint-category">
      <header className="tint-category__head">
        <span className="tint-category__eyebrow">Colección de color</span>
        <h1>Tintes</h1>
        <p>Encuentra tu tono explorando por grupo, familia o tipo. Cada burbuja es un color real.</p>
      </header>

      <TintFilterBar
        groups={groups}
        families={families}
        types={types}
        subcategories={subcategories}
        activeGroup={activeGroup}
        activeFamily={activeFamily}
        activeType={activeType}
        activeSubcategory={activeSubcategory}
        onGroupChange={setActiveGroup}
        onFamilyChange={setActiveFamily}
        onTypeChange={setActiveType}
        onSubcategoryChange={setActiveSubcategory}
      />

      <div className="tint-category__body">
        <div className="tint-category__bubbles">
          <TintBubbleField
            items={filteredItems}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            size="md"
          />
        </div>

        <div className="tint-category__panel">
          <TintShowcasePanel
            active={selected}
            onAddToCart={addToCart}
            formatPrice={formatPriceCOP}
          />
        </div>
      </div>
    </section>
  )
}
