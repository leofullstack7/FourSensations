# Plan de diseño — Categoría Tintes (GinnaBeauty)

## Concepto (signature element)
El tinte es líquido pigmentado. La interfaz se siente como **gotas de tinte flotando en un fluido** —
burbujas de color con física suave (drift, no rebote mecánico), que al pasar el mouse se "tensan"
como una gota real, y al hacer clic "revientan" suavemente revelando la ficha del producto.
Esto es lo único verdaderamente distintivo de la página; todo lo demás (tipografía, layout) se
mantiene fiel y sobrio a la identidad ya existente de GinnaBeauty (serif elegante + sans cálida,
paleta rosa/crema) para no romper coherencia con el resto del sitio.

## Tokens
- Fondo página categoría: crema GinnaBeauty existente (--gb-cream / #fdf6f9 aprox.)
- Acento primario: rosa GinnaBeauty existente (#c4547a)
- Acento secundario (nuevo, solo para esta sección): "tinte ink" — gradiente sutil violeta-rosa
  usado SOLO en el halo de las burbujas activas, nunca en texto: #c4547a → #8a4d8f
- Superficie panel imagen grande: blanco con sombra suave rosa (rgba(196,84,122,.12))
- Tipografía: reutiliza Playfair Display (display) + DM Sans (cuerpo) ya definidas en legal-pages
- Radio: burbujas = circle (50%), tarjetas = 20px (consistente con el resto del sitio)

## Layout — Página de categoría /categoria/tintes
Dos columnas en desktop (60/40), apiladas en mobile (imagen arriba, selector abajo):

```
┌─────────────────────────────┬──────────────────┐
│  FILTROS (sticky superior)  │                  │
│  Grupo destacado | Familia  │   IMAGEN         │
│  | Tipo | Subcategoría      │   PRINCIPAL       │
├─────────────────────────────┤   GRANDE         │
│                             │   (del tinte      │
│   ◯  ◯    ◯                │    activo)        │
│      ◯  ◯    ◯   burbujas  │                  │
│   ◯    ◯  ◯       de color │   [ficha flotante │
│                             │    al seleccionar]│
└─────────────────────────────┴──────────────────┘
```
- El filtro de **Grupo** es visualmente el más grande/destacado (chips grandes con conteo).
- Debajo, fila compacta de Familia / Tipo / Subcategoría (selects o chips pequeños).
- Las burbujas representan tintes ya filtrados por el grupo activo (o todos si no hay grupo elegido).
- Clic en burbuja → panel derecho se actualiza con imagen principal grande + ficha (nombre, nivel,
  precio, botón agregar) con técnica "reveal" (no salto brusco).

## Layout — Sección Home /  (preview)
Banda horizontal con scroll-snap, fondo distinto (franja con leve textura), tarjetas circulares
grandes por **Tipo** (no por tinte individual) mostrando la imagen principal de un tinte
representativo de ese tipo. Filtros visibles arriba: Familia (chips) que reordenan/filtran qué
Tipos se muestran. Clic en un Tipo → navega a `/categoria/tintes?tipo=<slug>`.

## Animación (deliberada, no decorativa)
1. Entrada: burbujas aparecen con stagger + drift ascendente sutil (no bounce).
2. Idle: drift continuo lentísimo (translate Y ±4px, 6-9s, ease sinusoidal) — sensación de líquido
   en suspensión, nunca llamativo.
3. Hover: escala 1.08 + el círculo se "estira" levemente (scaleY 1.05) simulando tensión de gota.
4. Selección: anillo de halo con gradiente tinte-ink pulsando 1 vez (no infinito) + imagen grande
   hace crossfade con leve scale-in (no slide).
5. Respeta `prefers-reduced-motion`: si está activo, drift y pulso se desactivan, solo quedan
   transiciones de opacidad cortas.
