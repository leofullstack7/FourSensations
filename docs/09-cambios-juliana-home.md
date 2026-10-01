# 09 — Cambios Juliana (home + tienda)

**Origen:** mensajes WhatsApp de Juliana Cabrera (17–21 sep 2026) + capturas `@img1`…`@img9`.  
**Producción:** https://foursensations.onrender.com  
**Local:** http://localhost:3000 (desde `foursensations/` → `npm run dev`)

**Cómo usar este doc:** cada ítem tiene **dónde revisar** (URL + qué mirar), **archivos** y **estado**. Ábrelo en el navegador y ve uno por uno.

**Imágenes de referencia** (orden del chat):

| Tag | Qué muestra |
|-----|-------------|
| `@img1` | Franja morada “Experiencia premium…” + fila Envío / Garantía / Originales |
| `@img2` | Promo cards home: Capilar + Accesorios (faltaba Cuidado Corporal) |
| `@img3` | Productos Destacados con chips de subcategorías |
| `@img4` | Sección “Rituales para cada momento” |
| `@img5` | Testimonios inventados |
| `@img6` | Newsletter “Únete / Club…” |
| `@img7` | Bloque marca del footer |
| `@img8` | Foto lab / científica (Sobre Nosotros) |
| `@img9` | Hero de `/cuenta/pedidos` |

**Excel Emma (fuente del motor):**

- `Downloads/Matriz_Respuestas_Emma_Four_Sensations (1).xlsx`
- `Downloads/Emma_Motor_Recomendacion_Four_Sensations.xlsx`

---

## Mapa rápido — dónde mirar cada cosa

| # | Tema | URL de revisión | Qué deberías ver |
|---|------|-----------------|------------------|
| 01 | Topbar | [/](https://foursensations.onrender.com/) | Franja superior: solo 4 frases rotando |
| 02 | Menú categorías | [/](https://foursensations.onrender.com/) (header) | Capilar → **Corporal** → Accesorios → Mayorista |
| 03 | Carrito / sin admin | [/](https://foursensations.onrender.com/) (header der.) | Icono carrito supermercado; **sin** engranaje admin |
| 04 | Marquee | [/](https://foursensations.onrender.com/) bajo banners | Solo las 9 frases de marca |
| 05 | Subcats + título/subtítulo | [/categoria/cuidado-capilar](https://foursensations.onrender.com/categoria/cuidado-capilar) y cards en home | Nuevo set de filtros; producto en 2 renglones |
| 06 | Sin preview 5 productos | [/](https://foursensations.onrender.com/) tras cards de subcats | **No** hay grilla de 5 productos al azar |
| 07 | Emma | [/](https://foursensations.onrender.com/) sección asesor | Nombre EMMA, 3 corazones, quiz 6 preguntas, rutina al final |
| 08 | Sin trust/innovation | [/](https://foursensations.onrender.com/) | **No** franja morada innov. ni Envío/Garantía/Originales |
| 09 | Promo Corporal | [/](https://foursensations.onrender.com/) promo cards | Card **Cuidado Corporal** |
| 10 | Favoritos del Club | [/](https://foursensations.onrender.com/#featured) | “LOS FAVORITOS DEL CLUB”; sin chips de subcats |
| 11 | Sin rituales | [/](https://foursensations.onrender.com/) | **No** existe “Rituales para cada momento” |
| 12 | Testimonios | [/](https://foursensations.onrender.com/) sección testimonios | Ciudad + etiqueta; rotan del banco de 50 |
| 13 | Newsletter | [/](https://foursensations.onrender.com/) bloque Club | Copy “¿TODAVÍA NO ESTÁS EN EL CLUB?” |
| 14 | Footer marca | [/](https://foursensations.onrender.com/) footer izq. | BE YOU… · Colombia · © 2026 SAS |
| 15 | Footer Productos | [/](https://foursensations.onrender.com/) footer | Enlace Cuidado Corporal |
| 16 | Footer registro | [/](https://foursensations.onrender.com/) footer form | Nombre + celular +57 + correo + disclaimer |
| 17 | Sobre nosotros | [/sobre-nosotros](https://foursensations.onrender.com/sobre-nosotros) | Página animada + foto lab; link en footer Empresa |
| 18 | WA Ayuda footer | [/](https://foursensations.onrender.com/) footer Ayuda | Abre WA con mensaje de compra |
| 19 | FAB WhatsApp | [/](https://foursensations.onrender.com/) burbuja fija | Mensaje de rutina ideal |
| 20 | Cuenta pedidos | [/cuenta/pedidos](https://foursensations.onrender.com/cuenta/pedidos) | “¡Tu historial de obsesiones!” sin eyebrow Club |
| 21 | Bomba Capilar | [/producto/bomba-capilar](https://foursensations.onrender.com/producto/bomba-capilar) | Producto Pre-Shampoo; también en subcat Pre - Shampoo |
| 22 | Cuenta · gate Mis pedidos | [/cuenta/pedidos](https://foursensations.onrender.com/cuenta/pedidos) | Copy favoritos/obsesiones (sin “bienvenida a la tienda”) |
| 23 | Cuenta · sidebar ayuda | [/cuenta/pedidos](https://foursensations.onrender.com/cuenta/pedidos) (columna der.) | ¿Necesitas ayuda? + WA + envío + puntos físicos Manizales |
| 24 | Cuenta · collage hero | [/cuenta/pedidos](https://foursensations.onrender.com/cuenta/pedidos) (hero der.) | 3 fotos nuevas Juliana (`/cuenta/hero-collage-*.jpg`) |
| 25 | Políticas envío · copy | [/politicas-envio](https://foursensations.onrender.com/politicas-envio) | Subtítulo, cobertura, tono suave en novedades/cambios/garantía/retracto/reversión |
| 26 | Políticas privacidad · copy | [/politicas-privacidad](https://foursensations.onrender.com/politicas-privacidad) | Subtítulo serio; sensibles/menores separados; derechos; canales; encargados |
| 27 | Capilar · hero + 3 cards | [/categoria/cuidado-capilar](https://foursensations.onrender.com/categoria/cuidado-capilar) | Copy antojo Juliana + CTA DESCUBRE TODO! |

---

## Checklist (estado)

| # | Sección | Estado | Commit |
|---|---------|--------|--------|
| 01–04, 06, 08–20 | Home / footer / cuenta / sobre nosotros | **hecho** | `240a11d` / `aa86beb` |
| 05 | Subcategorías + título/subtítulo | **hecho** | `aa1c5df` |
| 07 | Emma quiz + motor | **hecho** (lettering a mano pendiente de asset) | `aa1c5df` |
| 21 | Bomba Capilar | **hecho** (Neon + script) | `aa1c5df` |
| 22–24 | Cuenta pedidos: copy gate + sidebar ayuda + 3 fotos collage | **hecho** | `e41000b` |
| 25 | Políticas de envío: tono + cobertura + textos Juliana | **hecho** | `222c767` |
| 26 | Políticas de privacidad: tono serio + textos Juliana | **hecho** | `4d96fb9` |
| 27 | Cuidado capilar: hero antojo + 3 cards + CTA | **hecho** | pendiente push |

**Pendientes menores (no bloquean el lote):**

1. Asset lettering manuscrito “Emma” (diseñadora).
2. Si en producción el menú viene de DB y no del fallback, puede hacer falta sync para que **Cuidado Corporal** aparezca en nav/footer.
3. Ampliar casos borde del motor Excel si Juliana pide más combinaciones.

---

## Detalle por ítem (revisión)

### 01 — Franja superior (topbar)

- **Revisar:** https://foursensations.onrender.com/ → franja más alta  
- **Archivo:** `foursensations/lib/store-topbar-messages.ts`  
- **Solo estas 4 frases** (sin pago/garantía extra):
  1. Fórmulas con Intención 🍃 Resultados reales para tu cabello  
  2. El Club de los Cabellos Perfectos blonde‍♀️✨  
  3. Preparación en Máximo 2 días hábiles 📦 El tránsito lo define la transportadora  
  4. Despacho desde Manizales 🚚Envíos a todo Colombia 🇨🇴  
- **Estado:** hecho  

### 02 — Categorías en menú

- **Revisar:** https://foursensations.onrender.com/ → header / mega menú  
- **Orden:** Cuidado Capilar → **Cuidado Corporal** → Accesorios → Mayorista  
- **También:** https://foursensations.onrender.com/categoria/cuidado-corporal  
- **Archivos:** `foursensations/lib/menu-config.ts`, labels, shell de nav  
- **Estado:** hecho (fallback + promo; si el menú live es 100 % DB, puede necesitar sync)  

### 03 — Iconos header derecha

- **Revisar:** https://foursensations.onrender.com/ → iconos derecha del header  
- **Esperado:** carrito tipo supermercado; **no** hay botón ⚙️ Panel Admin (admin solo en `/admin`)  
- **Archivo:** `foursensations/components/store/StorefrontShell.tsx`  
- **Estado:** hecho  

### 04 — Marquee bajo banners

- **Revisar:** https://foursensations.onrender.com/ → justo debajo del hero/banners (`#marquee-track`)  
- **Archivo:** `foursensations/components/store/StoreHomeClient.tsx`  
- **Solo estas 9:**
  - FÓRMULAS DERMATOLÓGICAMENTE COMPROBADAS  
  - EL CLUB DE LOS CABELLOS PERFECTOS  
  - RESULTADOS REALES PARA TU CABELLO  
  - BIOINNOVACIÓN CAPILAR EN CADA FÓRMULA  
  - FÓRMULAS CON INTENCIÓN. RESULTADOS CON PROPÓSITO.  
  - VEGANOS  
  - ALTO DESEMPEÑO CAPILAR  
  - CIENCIA + INNOVACIÓN + UNA OBSESIÓN POR EL CABELLO  
  - LIBRES DE SALES, PARABENOS, PETROLATOS Y ACEITES MINERALES  
- **Estado:** hecho  

### 05 — Subcategorías + título / subtítulo

- **Revisar:**
  - https://foursensations.onrender.com/categoria/cuidado-capilar → filtros / grupos  
  - Cualquier card de producto en home o categoría → **2 renglones** (título + subtítulo)  
  - Ejemplo ficha: https://foursensations.onrender.com/producto/bomba-capilar  
- **Subcats nuevas:** Tratamientos · Shampoo y Acondicionador · Crecimiento y Fortalecimiento · Detox y Cuero Cabelludo · Finalizadores y Protección · Hair Mist · Reparación de Puntas · Pre - Shampoo  
- **Archivos:** `lib/hair-subcategories.ts`, `lib/category-showcase.ts`, `lib/product-display-names.ts`, `lib/category-landing-theme.ts`, `components/store/store-product-card.tsx`, `ProductLandingClient.tsx`  
- **Estado:** hecho  

### 06 — Quitar preview de 5 productos

- **Revisar:** https://foursensations.onrender.com/ → debajo de las cards de subcategorías  
- **Esperado:** **no** aparece grilla `gb-home-preview-products` de 5 al azar  
- **Archivo:** `StoreHomeClient.tsx`  
- **Estado:** hecho  

### 07 — EMMA (antes Juli)

- **Revisar:** https://foursensations.onrender.com/ → sección del asesor (bajo marquee / hero)  
- **Esperado:**
  - Nombre **EMMA** (lettering a mano de diseñadora → **pendiente de asset**; hoy tipografía del sitio)  
  - Lateral: “Hola, soy Emma…” + 3 corazones: TE ESCUCHO / TE GUÍO / TE RECOMIENDO  
  - Flujo: saludo → “Sí, conozcamos mi cabello 💗” → 6 preguntas → reacciones entre preguntas → al final “🪄Emma está armando tu rutina✨” → recomendación  
  - **Sin** productos hasta terminar el quiz  
- **Archivos:** `components/store/BeautyAiAdvisor.tsx`, `lib/emma/flow.ts`  
- **Estado:** hecho (motor portado; lettering pendiente)  

### 08 — Quitar innovation + trust (`@img1`)

- **Revisar:** https://foursensations.onrender.com/  
- **Esperado:** **no** franja morada “Experiencia premium…” ni fila Envío / Garantía / Originales; en esa zona quedan las frases de marca (ítem 04)  
- **Archivo:** `StoreHomeClient.tsx`  
- **Estado:** hecho  

### 09 — Promo cards + Cuidado Corporal (`@img2`)

- **Revisar:** https://foursensations.onrender.com/ → bloque de promo cards (Capilar / Corporal / Accesorios)  
- **Esperado:** card **Cuidado Corporal** visible y clickeable  
- **Archivo:** `StoreHomeClient.tsx`  
- **Estado:** hecho  

### 10 — Productos Destacados (`@img3`)

- **Revisar:** https://foursensations.onrender.com/#featured  
- **Esperado:**
  - Título / sub: **PRODUCTOS DESTACADOS** · **LOS FAVORITOS DEL CLUB 💗**  
  - **Sin** chips de subcategorías  
  - Favoritos: Bomba Capilar, Bloqueador (Fantasía Natural), Shine Gloss, Botanical, Scrub Glow, Hair Mist  
- **Archivos:** `StoreHomeClient.tsx`, `lib/home-club-favorites.ts`  
- **Estado:** hecho  

### 11 — Quitar Rituales (`@img4`)

- **Revisar:** https://foursensations.onrender.com/ (scroll completo)  
- **Esperado:** **no** existe “Rituales para cada momento”  
- **Archivo:** `StoreHomeClient.tsx`  
- **Estado:** hecho  

### 12 — Testimonios (`@img5`)

- **Revisar:** https://foursensations.onrender.com/ → sección testimonios  
- **Esperado:** formato **Ciudad + etiqueta** (no “Medellín · Cuidado capilar”); rotan 3–6 del banco de 50  
- **Archivo:** `foursensations/lib/store-testimonials.ts`  
- **Estado:** hecho  

### 13 — Newsletter (`@img6`)

- **Revisar:** https://foursensations.onrender.com/ → bloque Club / newsletter  
- **Esperado:** “¿TODAVÍA NO ESTÁS EN EL CLUB? 👀💗” + copy Four Girl + CTA correo  
- **Archivos:** `StoreHomeClient.tsx`, `app/store-page-overrides.css`  
- **Estado:** hecho  

### 14 — Footer marca (`@img7`)

- **Revisar:** https://foursensations.onrender.com/ → footer columna marca  
- **Esperado:**
  ```
  Four Sensations
  ¡Creamos nuevas formas de amar, cuidar y disfrutar tu cabello!💗
  BE YOU, BE FOUR SENSATIONS
  Marca Colombiana 🇨🇴 · Hecho en Colombia
  © 2026 Four Sensations S.A.S. Todos los derechos reservados
  ```
- **Archivo:** footer / `StoreHomeClient` o shell  
- **Estado:** hecho  

### 15 — Footer columna Productos

- **Revisar:** https://foursensations.onrender.com/ → footer “Productos”  
- **Esperado:** enlace **Cuidado Corporal** → `/categoria/cuidado-corporal`  
- **Estado:** hecho (vía menú; ver nota sync DB del ítem 02)  

### 16 — Footer registro

- **Revisar:** https://foursensations.onrender.com/ → formulario footer  
- **Esperado:** nombre, celular (+57), correo + disclaimer marketing  
- **Estado:** hecho  

### 17 — Sobre nosotros

- **Revisar:** https://foursensations.onrender.com/sobre-nosotros  
- **También:** footer → Empresa → Sobre nosotros  
- **Esperado:** página moderna/animada + foto lab (`@img8`)  
- **Archivos:** `app/(store)/(catalog)/sobre-nosotros/page.tsx`, `AboutUsClient`, CSS overrides  
- **Estado:** hecho  

### 18 — WhatsApp footer Ayuda

- **Revisar:** https://foursensations.onrender.com/ → footer Ayuda / WA  
- **Mensaje esperado al abrir chat:**  
  `Holaaa Four Sensations 💗 Vi varias cositas que me encantaron y quiero comprar. ¿Me ayudan con mi pedido? ✨`  
- **Estado:** hecho  

### 19 — WhatsApp FAB

- **Revisar:** https://foursensations.onrender.com/ → burbuja flotante WA  
- **Mensaje esperado:**  
  `Holaaa Four Sensations 💗 Vi tantas cositas que ya no sé cuál elegir jajaja 💗 ¿Me ayudan a encontrar mi rutina ideal? ✨`  
- **Estado:** hecho  

### 20 — Cuenta pedidos (`@img9`)

- **Revisar:** https://foursensations.onrender.com/cuenta/pedidos  
- **Esperado:**
  - Título: **¡Tu historial de obsesiones!**  
  - Texto sobre iniciar sesión / pedidos  
  - **Sin** eyebrow “Four Sensations · Club de los Cabellos Perfectos”  
- **Archivos:** `AccountFrame` / página pedidos  
- **Estado:** hecho  

### 21 — Producto Bomba Capilar

- **Revisar:**
  - https://foursensations.onrender.com/producto/bomba-capilar  
  - https://foursensations.onrender.com/categoria/cuidado-capilar (filtro **Pre - Shampoo**)  
  - Home `#featured` (debe aparecer en favoritos)  
- **Esperado:** título **Bomba Capilar** · subtítulo **Dulce Renacer + Repolarizador Capilar**  
- **Archivos:** `scripts/upsert-bomba-capilar.mjs` (ya corrido en Neon), `product-display-names.ts`, menú/subcats  
- **Estado:** hecho  

### 22 — Mis pedidos · copy del gate (`@img1`)

- **Revisar:** https://foursensations.onrender.com/cuenta/pedidos (sin sesión) → card blanca central  
- **Esperado:**
  - Título: **Mis pedidos**  
  - Lead: *Tus favoritos, tus compras y tus próximas obsesiones 💗*  
  - Cuerpo: *Inicia sesión para consultar tus pedidos, guardar tus favoritos y hacer tus próximas compras mucho más fácil.*  
  - **Sin** “darte la bienvenida en la tienda”  
- **Archivos:** `AccountGate.tsx`, `cuenta/pedidos/page.tsx`  
- **Estado:** hecho  

### 23 — Sidebar cuenta · ayuda (no admin) (`@img2`)

- **Revisar:** https://foursensations.onrender.com/cuenta/pedidos → columna derecha  
- **Esperado:**
  - Título **¿Necesitas ayuda? 💗** + copy de apoyo al pedido  
  - WhatsApp clickeable + horario  
  - Bloque envío (2 días hábiles; tránsito = transportadora)  
  - “¿Algo pasó…?” + link **HABLAR CON NOSOTRAS 💗** → WhatsApp  
  - **Puntos de venta** Fundadores, Mall Plaza, Parque Caldas, El Cable (horarios)  
  - **Sin** Posventa defensiva, dirección legal SAS, correo, “La tienda / ciencia y encanto…”  
- **Archivo:** `AccountFrame.tsx`, `account-space.css`  
- **Estado:** hecho  

### 24 — Collage hero cuenta (`@img3` → `@img4–6`)

- **Revisar:** https://foursensations.onrender.com/cuenta/pedidos → 3 polaroids del hero  
- **Esperado:** tres fotos lifestyle Juliana (productos en bata, Shine Gloss, coquette / hair mist)  
- **Assets:** `public/cuenta/hero-collage-1.jpg` … `-3.jpg`  
- **Archivo:** `AccountFrame.tsx` (`ACCOUNT_COLLAGE`)  
- **Estado:** hecho  

### 25 — Políticas de envío (tono + precisión)

- **Revisar:** https://foursensations.onrender.com/politicas-envio  
- **Esperado:**
  1. Subtítulo: *Todo lo que necesitas saber sobre tu compra, envío y servicio posventa.*  
  2. Cobertura: solo **Todo Colombia** (sin “no hay recogida en tienda”)  
  3. Nota preparación: plazo = solo preparación; tránsito/fecha = transportadora  
  4. Novedades: tono de ayuda + WA clickeable  
  5. Cambios comerciales: sin tono defensivo ni “no reingresa al inventario”  
  6. Garantía / retracto / reversión: textos suavizados de Juliana  
- **Archivos:** `app/(store)/politicas-envio/page.tsx`, `lib/storefront-policies.ts`  
- **Estado:** hecho  

### 26 — Políticas de privacidad (tono serio)

- **Revisar:** https://foursensations.onrender.com/politicas-privacidad  
- **Esperado:**
  1. Subtítulo: *Tu información, tus derechos y nuestra responsabilidad.* (sin frase del cabello)  
  2. **Datos sensibles** y **Datos de niños, niñas y adolescentes** como secciones separadas  
  3. Derechos del titular ampliados (lista Juliana)  
  4. Canales de atención reformulados  
  5. Título **Encargados del tratamiento y terceros** + párrafo operativo + “no vende datos”  
- **Archivo:** `app/(store)/politicas-privacidad/page.tsx`  
- **Estado:** hecho  

### 27 — Cuidado capilar · hero + 3 cuadros (`@img1`, `@img2`)

- **Revisar:** https://foursensations.onrender.com/categoria/cuidado-capilar  
- **Esperado:**
  - Headline: *Tu cabello está a punto de conocer sus nuevas obsesiones 💗*  
  - Párrafo fórmulas + línea *HAIR GLOW UP*  
  - CTA: **DESCUBRE TODO!**  
  - 3 cards antojo: PARA CADA HAIR MOOD · TU PELO EN SU BEST ERA · ENCUENTRA TU NUEVA OBSESIÓN  
- **Archivo:** `lib/category-landing-theme.ts`  
- **Estado:** hecho  

---

## Log de avance

| Fecha | Ítems | Commit |
|-------|-------|--------|
| 2026-09-30 | 01–04, 06, 08–20 (lote home/footer/cuenta/sobre nosotros) | `240a11d` / `aa86beb` |
| 2026-09-30 | 05 subcats + títulos, 07 Emma quiz+motor, 21 Bomba Capilar | `aa1c5df` |
| 2026-09-30 | Doc: mapa de rutas de revisión por ítem | (este archivo) |
| 2026-09-30 | 22–24 cuenta pedidos: copy, sidebar ayuda, collage | `e41000b` |
| 2026-09-30 | 25 políticas de envío (tono Juliana) | `222c767` |
| 2026-09-30 | 26 políticas de privacidad (tono Juliana) | `4d96fb9` |
| 2026-09-30 | 27 cuidado capilar hero + cards | pendiente push |
