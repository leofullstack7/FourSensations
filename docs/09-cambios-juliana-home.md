# 09 — Cambios Juliana (home + tienda)

**Origen:** mensajes WhatsApp de Juliana Cabrera (17–21 sep 2026) + pantallazos `@img1`…`@img9`.  
**Cómo usar:** cada ítem es un cambio atómico. Marcamos estado al cerrarlo. Un cambio → un commit cuando se pueda.

**Imágenes de referencia** (orden del chat):

| Tag | Qué muestra |
|-----|-------------|
| `@img1` | Franja morada “Experiencia premium / Asesoría IA / Checkout…” + fila blanca Envío / Garantía / Originales |
| `@img2` | Promo cards home: solo Capilar + Accesorios (falta Cuidado Corporal) |
| `@img3` | Productos Destacados con chips de subcategorías (Tratamientos, Rutinas…) |
| `@img4` | Sección “Rituales para cada momento” (duplica subcats) |
| `@img5` | Testimonios inventados (ciudad · categoría) |
| `@img6` | Newsletter “Únete / Club de los Cabellos Perfectos” |
| `@img7` | Bloque marca del footer (logo + párrafo + copyright) |
| `@img8` | Foto lab / científica rosa (Sobre Nosotros) — `IMG_0095` |
| `@img9` | Hero de `/cuenta/pedidos` con eyebrow repetida |

**Archivos Excel (Emma):**

- `Downloads/Matriz_Respuestas_Emma_Four_Sensations (1).xlsx`
- `Downloads/Emma_Motor_Recomendacion_Four_Sensations.xlsx`

---

## Checklist (orden de trabajo)

| # | Sección | Cambio | Ref | Estado |
|---|---------|--------|-----|--------|
| 01 | Franja superior (topbar) | Solo 4 frases textuales | — | hecho |
| 02 | Header · categorías | Añadir **Cuidado Corporal** (orden: Capilar → Corporal → Accesorios → Mayorista) | `@img2` | hecho (menú fallback + promo; DB menú puede necesitar sync) |
| 03 | Header · iconos | Carrito = supermercado (no bolsa/basurero); **quitar panel admin** del público | — | hecho |
| 04 | Marquee bajo banners | Solo la lista de 9 frases de marca | — | hecho |
| 05 | Subcategorías capilar | Nuevo set + mapping producto → subcat; título/subtítulo por producto | — | hecho |
| 06 | Home preview 5 productos | Quitar bloque de 5 productos al azar bajo las cards de subcats | — | hecho |
| 07 | Asesor IA | Renombrar Juli → **EMMA**; copy; corazones; flujo de 6 preguntas; sin productos hasta el final; reacciones; motor Excel | — | hecho |
| 08 | Franja morada + trust | Quitar `@img1` (innovation + envío/garantía/originales); poner ahí las mismas 9 frases de marca | `@img1` | hecho |
| 09 | Promo cards | Añadir card **Cuidado Corporal** | `@img2` | hecho |
| 10 | Productos Destacados | Quitar chips de subcats; copy “LOS FAVORITOS DEL CLUB”; lista fija de favoritos | `@img3` | hecho |
| 11 | Rituales | Quitar sección completa | `@img4` | hecho |
| 12 | Testimonios | Banco de 50 reales; rotar 3–6; ciudad + etiqueta (no categoría) | `@img5` | hecho |
| 13 | Newsletter | Nuevo copy Club / Four Girl | `@img6` | hecho |
| 14 | Footer · marca | Nuevo texto BE YOU + Colombia + copyright SAS | `@img7` | hecho |
| 15 | Footer · Productos | Incluir Cuidado Corporal | — | hecho (vía menú) |
| 16 | Footer · newsletter | Nombre + celular +57 + correo + disclaimer marketing | — | hecho |
| 17 | Footer · Empresa | Página **Sobre nosotros** nueva (animada) + `@img8` | `@img8` | hecho |
| 18 | Footer · Ayuda WA | Mensaje personalizado de atención | — | hecho |
| 19 | FAB WhatsApp | Mensaje sticky/burbuja | — | hecho |
| 20 | Cuenta · pedidos | Nuevo hero sin “Club…” repetido | `@img9` | hecho |
| 21 | Catálogo | Crear producto **Bomba Capilar** (Dulce Renacer + Repolarizador) | — | hecho (DB Neon + script) |

---

## Detalle por ítem

### 01 — Franja superior (topbar)

**Archivo:** `foursensations/lib/store-topbar-messages.ts`

Solo estas 4 (eliminar el resto: pago, garantía, etc.):

1. `Fórmulas con Intención 🍃 Resultados reales para tu cabello`
2. `El Club de los Cabellos Perfectos blonde‍♀️✨`
3. `Preparación en Máximo 2 días hábiles 📦 El tránsito lo define la transportadora`
4. `Despacho desde Manizales 🚚Envíos a todo Colombia 🇨🇴`

### 02 — Categorías en menú

Orden público:

1. Cuidado Capilar  
2. **Cuidado Corporal** (nuevo)  
3. Accesorios  
4. Mayorista  

**Archivos:** `lib/menu-config.ts`, seed/menú Prisma, `category-labels.ts`, shell de nav.

### 03 — Iconos header derecha

- Carrito: SVG de carrito de supermercado (header + FAB si aplica).
- Quitar botón ⚙️ / Panel Admin del header público (`StorefrontShell`). Admin solo por URL `/admin`.

### 04 — Marquee bajo banners hero

**Archivo:** `StoreHomeClient.tsx` (bloque `marquee-strip`)

Solo:

- FÓRMULAS DERMATOLÓGICAMENTE COMPROBADAS  
- EL CLUB DE LOS CABELLOS PERFECTOS  
- RESULTADOS REALES PARA TU CABELLO  
- BIOINNOVACIÓN CAPILAR EN CADA FÓRMULA  
- FÓRMULAS CON INTENCIÓN. RESULTADOS CON PROPÓSITO.  
- VEGANOS  
- ALTO DESEMPEÑO CAPILAR  
- CIENCIA + INNOVACIÓN + UNA OBSESIÓN POR EL CABELLO  
- LIBRES DE SALES, PARABENOS, PETROLATOS Y ACEITES MINERALES  

### 05 — Subcategorías + productos

Nuevas subcats:

| Subcategoría | Productos (título / subtítulo) |
|--------------|--------------------------------|
| Tratamientos | Dulce Renacer · Tratamiento Capilar Nutritivo · Sensación Primaveral · Repolarizador Capilar · Proteína Capilar · 10 en 1 |
| Shampoo y Acondicionador | Botanical · Shampoo · Kit Tentación Equilibrio · Shampoo & Acondicionador Cebolla · Kit Tentación Nutrición · Shampoo & Acondicionador Aguacate · Kit Scalp Therapy · Shampoo & Acondicionador Carbón Activado |
| Crecimiento y Fortalecimiento | Secreto de Primavera · Tónico Capilar · Shots Capilares · Anticaída • Reparación • Crecimiento |
| Detox y Cuero Cabelludo | Scrub Glow · Exfoliante Capilar · Kit Scalp Therapy · … · Cepillo · Masajeador Capilar |
| Finalizadores y Protección | Fantasía Natural · Bloqueador Capilar · Shine Gloss · Óleo Capilar |
| Hair Mist | Sweet Love / BloomShine / Scarlette / Golden Glow · Perfume Capilar |
| Reparación de Puntas | Luna Llena · Suero Capilar · Suspiros · Aceite Multipropósito |
| Pre - Shampoo | **Bomba Capilar** · Dulce Renacer + Repolarizador Capilar (**crear producto**) |

UI: cada producto en 2 renglones (título + subtítulo).

**Archivos:** `hair-subcategories.ts`, `category-showcase.ts`, menú, cards/ficha producto.

### 06 — Quitar preview de 5 productos

En home, quitar `gb-home-preview-products` (los 5 al azar debajo de `CategoryShowcaseStrip`).

### 07 — EMMA (antes Juli)

- Nombre: **EMMA** (lettering a mano de diseñadora → pendiente de asset).
- Lateral izquierdo: copy “Hola, soy Emma…” + 3 corazones: TE ESCUCHO / TE GUÍO / TE RECOMIENDO.
- Flujo chat: saludo → botón “Sí, conozcamos mi cabello 💗” → 6 preguntas (selección única/múltiple según spec).
- Entre preguntas: reacciones cortas (escucha), **sin** diagnosticar ni mostrar productos.
- Tras P6: transición “🪄Emma está armando tu rutina✨” → interpretar → recomendar → explicar uso.
- Motor: Excel matriz + motor de recomendación.

**Archivos:** `BeautyAiAdvisor.tsx`, `ai-advisor.ts`, `juli-knowledge.ts` (renombrar/adaptar), assets lettering.

### 08 — Quitar innovation + trust (`@img1`)

- Quitar `BrandInnovationStrip` del home.
- Quitar sección `trust-section` (Envío / Garantía / Originales).
- En esa zona (o reutilizar franja): las 9 frases de marca del ítem 04.

### 09 — Promo cards + Cuidado Corporal (`@img2`)

Añadir tercera card (o reordenar) **Cuidado Corporal** junto a Capilar y Accesorios / mayorista.

### 10 — Productos Destacados (`@img3`)

Copy:

- Eyebrow / título: **PRODUCTOS DESTACADOS**  
- Sub: **LOS FAVORITOS DEL CLUB 💗**  
- Texto: “Nuestros productos más amados…”

Sin chips de subcategorías. Mostrar favoritos:

Bomba Capilar, Bloqueador Capilar (Fantasía Natural), Shine Gloss, Botanical, Scrub Glow, Perfumes (Hair Mist).

### 11 — Quitar Rituales (`@img4`)

Eliminar sección `lifestyle-section` (“Rituales para cada momento”).

### 12 — Testimonios (`@img5`)

- Reemplazar 3 inventados por banco de **50** comentarios reales (lista en WhatsApp).
- Formato detalle: **Ciudad + etiqueta** (Favorito del Club, Cliente Frecuente…), **no** “Medellín · Cuidado capilar”.
- Rotar 3–6 por visita (banco completo en código).

### 13 — Newsletter (`@img6`)

Reemplazar todo el bloque por:

- ¿TODAVÍA NO ESTÁS EN EL CLUB? 👀💗  
- Esto te va a interesar…  
- Ser Four Girl… (copy completo del chat)  
- CTA correo + entrar al Club  

### 14 — Footer marca (`@img7`)

```
Four Sensations
¡Creamos nuevas formas de amar, cuidar y disfrutar tu cabello!💗
BE YOU, BE FOUR SENSATIONS
Marca Colombiana 🇨🇴 · Hecho en Colombia 
© 2026 Four Sensations S.A.S. Todos los derechos reservados
```

### 15 — Footer columna Productos

Incluir enlace **Cuidado Corporal** (viene del menú cuando exista la categoría).

### 16 — Footer registro

Campos: nombre, celular (+57), correo.  
Microcopy: “Al registrarte aceptas recibir correos electrónicos de marketing y mensajes de texto”.

### 17 — Sobre nosotros

Nueva ruta (ej. `/sobre-nosotros`) moderna, animada, copy del chat + foto `@img8`.  
Link footer Empresa → esa página.

### 18 — WhatsApp footer Ayuda

Mensaje:

`Holaaa Four Sensations 💗 Vi varias cositas que me encantaron y quiero comprar. ¿Me ayudan con mi pedido? ✨`

### 19 — WhatsApp FAB

Mensaje:

`Holaaa Four Sensations 💗 Vi tantas cositas que ya no sé cuál elegir jajaja 💗 ¿Me ayudan a encontrar mi rutina ideal? ✨`

### 20 — Cuenta pedidos (`@img9`)

Hero:

- Título: **¡Tu historial de obsesiones!**  
- Texto: “¿Quieres saber qué pediste… Inicia sesión y encuentra todos tus pedidos Four Sensations aquí. ✨”  
- Quitar eyebrow “Four Sensations · Club de los Cabellos Perfectos”.

### 21 — Producto Bomba Capilar

Crear en catálogo (admin/seed): Pre-Shampoo = Dulce Renacer + Repolarizador.

---

## Fuera de alcance de este lote / pendientes de asset

- Lettering manuscrito “Emma” (diseñadora).
- Import completo del motor Excel a código tipado (ítem 07).
- Precios / stock reales de Cuidado Corporal si aún no hay SKUs.

---

## Log de avance

| Fecha | Ítems | Commit |
|-------|-------|--------|
| 2026-09-30 | 01–04, 06, 08–20 (lote home/footer/cuenta/sobre nosotros). Quedan 05, 07, 21 | `240a11d` |
| 2026-09-30 | 05 subcats + títulos, 07 Emma quiz+motor, 21 Bomba Capilar | pendiente push |
