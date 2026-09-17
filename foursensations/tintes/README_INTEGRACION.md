# Integración Tintes — Página de categoría + Preview Home
## Prompt para Cursor

Copia y pega esto en Cursor junto con los 6 archivos adjuntos
(TintBubbleField.tsx, TintShowcasePanel.tsx, TintFilterBar.tsx,
TintCategoryPageClient.tsx, TintHomePreview.tsx, tints.css).

---

> Voy a agregar una experiencia visual especial para la categoría "Tintes". Te adjunto 6 archivos ya construidos (componentes React + CSS) que debes integrar al proyecto real, NO copiarlos literalmente sin adaptar — hay puntos marcados como "INTEGRACIÓN (Cursor)" en los comentarios de cada archivo que debes resolver con el código real del proyecto. Lee todo antes de tocar nada.
>
> ---
>
> ## 1. UBICACIÓN DE ARCHIVOS
>
> Copia estos archivos a:
> - `web/components/store/tints/TintBubbleField.tsx`
> - `web/components/store/tints/TintShowcasePanel.tsx`
> - `web/components/store/tints/TintFilterBar.tsx`
> - `web/components/store/tints/TintCategoryPageClient.tsx`
> - `web/components/store/tints/TintHomePreview.tsx`
> - `web/components/store/tints/tints.css`
>
> ## 2. MODELO DE DATOS — Mapeo a `TintBubbleItem`
>
> Estos componentes esperan un shape `TintBubbleItem`:
> ```typescript
> interface TintBubbleItem {
>   id: string
>   name: string
>   colorImageUrl: string   // foto real del resultado en cabello
>   mainImageUrl: string    // imagen principal del producto
>   level?: string | null   // tintLevel
>   group?: string | null   // tintGroup
>   family?: string | null  // tintFamily.name
>   type?: string | null    // tintType.name
>   price: number
>   slug: string
> }
> ```
>
> Crea una función mapper en `web/lib/tints.ts` que convierta un `Product` (con sus relaciones `tintFamily`, `tintType`, `images`) al shape `TintBubbleItem`:
> - `colorImageUrl`: usa la SEGUNDA imagen del producto (la "imagen del color"/resultado en cabello) — si el modelo `ProductImage` no distingue cuál es cuál todavía, agrega un campo `imageRole` (`'main' | 'color'`) o usa convención de `sortOrder` (0 = principal, 1 = color). Decide con base en cómo ya se sube/maneja la galería en el admin de carga masiva de Tintes.
> - `mainImageUrl`: usa `Product.imageUrl` (la imagen principal ya existente)
> - `level`, `group`: directo de `Product.tintLevel` y `Product.tintGroup`
> - `family`, `type`: de `Product.tintFamily?.name` y `Product.tintType?.name`
>
> ## 3. PÁGINA DE CATEGORÍA `/categoria/tintes`
>
> Busca cómo se generan las páginas de categoría actualmente (`app/(store)/categoria/[slug]/page.tsx`). Esa ruta dinámica ya sirve cualquier categoría — debes hacer que SOLO cuando el slug resuelva a la categoría "Tintes" (o el slug exacto que tenga en DB), se renderice `TintCategoryPageClient` en lugar del layout genérico de categoría. El resto de categorías sigue usando el componente genérico actual sin cambios.
>
> Ejemplo de integración en ese archivo:
> ```tsx
> import TintCategoryPageClient from '@/components/store/tints/TintCategoryPageClient'
> import { getTintBubbleItems } from '@/lib/tints'
>
> // dentro del componente de página, después de resolver la categoría:
> if (category.slug === 'tintes') {
>   const items = await getTintBubbleItems()
>   return <TintCategoryPageClient initialItems={items} addToCart={/* función real del carrito */} />
> }
> // ...resto del flujo genérico de categoría sin cambios
> ```
>
> `getTintBubbleItems()` en `web/lib/tints.ts` debe usar `unstable_cache` igual que el resto de queries de catálogo (`revalidate: 300`), consistente con cómo ya está optimizado el resto del sitio.
>
> El `addToCart` que se le pasa a `TintCategoryPageClient` debe ser exactamente la misma función/hook de carrito que ya usa `StoreHomeClient` — no dupliques lógica de carrito nueva.
>
> ## 4. PREVIEW EN EL HOME
>
> En la página principal de la tienda (`app/(store)/page.tsx` o `StoreHomeClient.tsx`, según donde estén las demás secciones/franjas de categoría), inserta `<TintHomePreview items={tintItems} />` en una posición razonable del home (sugerido: después de la franja de categorías destacadas existente, o donde el negocio quiera resaltarlo).
>
> `items` debe venir de la misma `getTintBubbleItems()` cacheada — no dupliques la query.
>
> Si no hay NINGÚN producto de categoría Tintes aún en la base de datos, el componente ya retorna `null` automáticamente (no rompe el home).
>
> ## 5. FORMATO DE PRECIO
>
> En `TintCategoryPageClient.tsx` hay un `formatPriceCOP` local con `Intl.NumberFormat`. Sustitúyelo por el helper de formato de precio COP que ya existe en el proyecto (busca cómo se formatean precios en `StoreHomeClient.tsx` o `lib/products.ts`) para mantener consistencia exacta con el resto del sitio.
>
> ## 6. IMÁGENES — next/image
>
> Todos los componentes ya usan `next/image`. Verifica que los dominios de Bunny CDN sigan correctamente configurados en `next.config.mjs` → `images.remotePatterns` (ya deberían estarlo de una optimización anterior).
>
> ## 7. ACCESIBILIDAD Y MOTION
>
> Los componentes ya respetan `prefers-reduced-motion` vía `useReducedMotion` de Framer Motion. No remuevas esa lógica.
>
> ## 8. VARIABLES CSS
>
> El archivo `tints.css` define variables de respaldo (`--tint-pink`, `--tint-cream`, etc.) con los valores hex ya usados en el resto del sitio. Si el proyecto ya tiene variables CSS globales equivalentes (revisa `design-system.css` / `globals.css`), reemplaza los valores hardcodeados de `tints.css` por esas variables existentes para evitar dos fuentes de verdad de color.
>
> ## REGLAS
> - No toques el flujo de categorías genérico para ninguna otra categoría (Maquillaje, Cuidado piel, etc.) — el cambio es exclusivo para el slug "tintes"
> - No dupliques lógica de carrito, formato de precio, ni cache — reusa lo existente
> - No toques ePayco, Bold, checkout, ni admin
> - Si `Product.tintFamily`, `Product.tintType`, `Product.tintLevel`, `Product.tintGroup` no existen todavía con esos nombres exactos en el schema (de la implementación anterior de carga masiva de Tintes), ajusta el mapper en `lib/tints.ts` a los nombres reales — no renombres el schema
>
> Importa las fuentes `Playfair Display` y `DM Sans` si aún no están cargadas globalmente (ya se usaron en las páginas legales, debería ser trivial reusar el mismo import)

---

## Decisiones de diseño tomadas (resumen para contexto)
- **Signature element**: burbujas como gotas de tinte en suspensión (drift lento, tensión al hover, halo pulsante al seleccionar) — coherente con que el producto literalmente es tinte líquido.
- **Imagen del color** = foto real en cabello (confirmado) → se usa en las burbujas pequeñas.
- **Imagen principal** = la del producto/empaque → se usa en el panel grande y en las tarjetas de Tipo del home.
- **Estado vacío inicial**: se preselecciona automáticamente el primer tinte del listado/grupo activo (confirmado) — nunca se muestra el panel vacío salvo que no haya ningún resultado.
- **Filtro de Grupo**: el más grande y destacado visualmente (chips grandes con conteo), por encima de Familia/Tipo/Subcategoría que son selects compactos secundarios.
- **Home → categoría**: clic en una tarjeta de Tipo en el home SIEMPRE navega a la página completa de categoría con `?tipo=` precargado (confirmado), no se expande inline.
