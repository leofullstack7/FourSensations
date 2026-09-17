# 08 — Estado de la propuesta Four Sensations

**Fecha:** 8 de septiembre de 2026  
**Para qué sirve:** mapa vivo de lo que ya está hecho y lo que falta, cruzando la guía maestra (`foursensations/marca/GUIA_FOURSENSATIONS_CURSOR.md`), la fase 7 de cuentas (`docs/07-cuentas-de-servicio.md`) y el trabajo de producto de las últimas sesiones.

Código de la tienda: `foursensations/` · local: `npm run dev` → http://localhost:3000

**Leyenda**

| Marca | Significado |
|---|---|
| **Hecho** | En código y usable en local |
| **Parcial** | Hay base, pero falta producción, datos reales o un ajuste |
| **Falta** | No está, o está aplazado a propósito |

---

## 1. Fases de la guía maestra (rebrand)

### Fase 1 — Textos, metadatos, voz de marca — **Hecho**

- Nombre Four Sensations, metadatos SEO, topbar, WhatsApp/correo oficiales en copy.
- Asesor IA = **Juli** (no Ginna), con KB capilar (`lib/juli-knowledge.ts`).
- Componente de innovación renombrado a `BrandInnovationStrip`.
- Quedan aliases internos `GINNA_*` deprecados en `lib/ai-advisor-persona.ts` (no se ven al cliente). Un grep de “Ginna” en UI pública no debería mostrar marca; sí puede aparecer en `marca/GUIA_*` y `referencia/`.

### Fase 2 — Identidad visual — **Hecho** (con pendientes de diseño)

- Paleta oficial en `:root` (lila, rosa, menta, amarillo, fondos).
- Nunito + Great Vibes.
- Logos PNG en `assets/foursensations/` y favicons.
- **Falta:** SVG/AI original del logo; confirmar HEX de dorado y morado de títulos si el diseñador tiene valores exactos.

### Fase 3 — Menú y categorías — **Hecho**

Nav público: **Cuidado capilar**, **Accesorios**, **Mayorista**.  
Sin maquillaje / piel / hombres / uñas en tienda (siguen existiendo en admin/DB si hiciera falta después).

Subcategorías capilares alineadas al catálogo: Tratamientos, Rutinas, Finalizadores, Tónicos, Fragancias, Multiuso.

Selector de **marcas** del header: **quitado** (solo existe Four Sensations).

### Fase 4 — Catálogo — **Parcial**

- Fotos locales por SKU en `assets/productos/` (FS001…FS031) y ruta `/api/media/productos/...`.
- Fichas `/producto/[slug]`: galería, zoom, hero, compra sticky.
- Landings de categoría con collage (capilar) y **galería FS027** (accesorios).
- **Falta / validar:** precios vigentes (en UI a veces se ve `$0` si el admin no tiene precio); CSV de carga masiva vs PDF; mock de desarrollo si se apaga la DB; kits / sachets / campañas (Navidad, chocolate) en menú si deben ser públicos.

### Fase 5 — Legales — **Hecho** (revisión legal pendiente)

Páginas de envío, privacidad y términos con Manizales, 2 días hábiles, Envía/Interrapidísimo, sin envío gratis inventado, sin tienda, sin same-day.

**Falta:** revisión de un abogado antes de publicar. El microcopy de la tienda (modal, home, footer, Juli, checkout, correos) ya está alineado con estas páginas: sin «7 días de devolución», sin envío gratis inventado, sin Bold como medio actual.

### Fase 6 — Contacto, envío, footer — **Hecho** (confirmar datos)

- WhatsApp canónico `304 363 2492` / `573043632492` en `lib/storefront-contact.ts`.
- Zonas de envío de referencia en checkout (no umbral de envío gratis).
- **Falta:** redes sociales (IG/TikTok/Facebook) si existen; confirmar si el número de WhatsApp es el definitivo (07.11).

### Fase 7 — Cuentas de servicio — **Parcial** (tú + hosting)

Ver sección 3 de este archivo y `docs/07-cuentas-de-servicio.md`.

### Fase 8 — QA / lanzamiento — **Falta**

- `npm run build` en limpio y pase visual (home, ficha, checkout, admin, legales, cuenta, Juli).
- Grep final de copy visible de GinnaBeauty.
- Deploy en hosting **nuevo** + dominio (no Render/GitHub de Ginna).

---

## 2. Infraestructura (doc 07)

| Ítem | Estado |
|---|---|
| 07.1 Git propio (sin push a Ginna) | **Hecho** en checklist del 07; no pushear a `ginnabeauty` |
| 07.2 Neon PostgreSQL propio | **Hecho** (local) |
| 07.3 `.env.local` + AUTH_SECRET + admin | **Hecho** (local) |
| 07.4 Prisma push/seed en Neon FS | **Hecho** (local) |
| 07.5 Dominio + `NEXT_PUBLIC_SITE_URL` | **Falta** |
| 07.6 Google OAuth | **Parcial:** funciona en localhost; falta URI de producción en Google Console + `AUTH_URL` |
| 07.7 Bunny CDN | **Hecho** (local; claves en env) |
| 07.8 Pasarela (ePayco) | **Aplazado** a propósito |
| 07.9 Bold | **Omitido** salvo que lo pidas |
| 07.10 Resend | **Parcial:** API key local; SPF/DKIM espera dominio |
| 07.11 WhatsApp | **Parcial:** número en env; confirmar oficial |
| 07.12 OpenAI (Juli / fichas admin) | **Falta** confirmar si la key está en local y si se usa en prod |
| 07.13 Hosting Render nuevo | **Falta** |
| 07.14 Prueba env-check + admin | **Parcial:** se puede hacer ya en local |

Cuando exista `https://tudominio.com`: cerrar de un tiro 07.5 + Google callback + Resend from + env del host.

Detalle OAuth: `docs/GOOGLE_OAUTH.md`.

---

## 3. Trabajo de producto (sesiones posteriores a la guía)

Esto **no** estaba escrito como fase en 2026-09-01; ya está en el código.

### Cuenta e inicio de sesión — **Hecho** (prod OAuth pendiente)

- Registro / login correo + Google (clientes `CUSTOMER`).
- Nombre en el **topbar** (derecha, brillo).
- Popover: **Mi Perfil**, **Mis pedidos**.
- Rutas `/cuenta/perfil` y `/cuenta/pedidos` (hero collage, info de tienda, pedidos por `userId` o mismo correo).
- Modal auth: scroll interno redondeado, CTA Google.
- **Falta:** probar el flujo completo en producción; checkout **no** lleva el shell de tienda (el nombre del topbar no se ve ahí).

### Ficha de producto `/producto/[slug]` — **Hecho**

Galería completa del SKU, zoom/lupa, lightbox, card de compra, botón **Abrir ficha completa** en el modal (cápsula lila).

### Home / marca — **Hecho** (iteraciones)

Logos actuales (`logo1`, etc.), héroes, botón Descúbrelos, menú fijo.

### Juli (chat IA) — **Hecho** (OpenAI en prod es 07.12)

Nombre Juli, chips capilares, recomendaciones en slider.  
Tarjetas del chat: **pequeñas y verticales** (≈108px, foto 3:4).  
**Falta:** confirmar que no mueve el scroll de la página; afinado visual si pides otro tamaño.

### Landings de categoría — **Hecho**

| Página | Qué hay | Qué falta |
|---|---|---|
| Cuidado capilar | Collage 3 fotos al azar del catálogo, copy comercial, filtro por familia + línea, mosaico más compacto | Validar que cada SKU filtre bien si el `menuTag` en DB no coincide |
| Accesorios | Galería **FS027 Accesorios** (16 webp), filtro por tipo, cards chicas | Vincular cada foto de la carpeta a un SKU/tipo si quieres galería = producto clicable |
| Mayorista | Collage, copy de normativas (Manizales, 2 días, $700.000, WhatsApp) | Confirmar umbral mayorista con negocio; no hay formulario de alta, solo WhatsApp |

### Checkout / pedidos — **Parcial**

- Checkout y resultado existen; pedidos se guardan y se listan en **Mis pedidos** si hay sesión o mismo email.
- **Falta:** pasarela real (07.8); precios 0 rompen la percepción de compra; probar un pedido de punta a punta cuando haya cobro.

---

## 4. Lo que falta hacer (prioridad sugerida)

Orden práctico para no mezclar diseño con go-live:

1. **Datos de catálogo:** precios reales, stock, que nada público muestre `$0`.
2. **Microcopy vs legales:** quitar o reescribir «7 días devolución» en el modal.
3. **Dominio + Google OAuth prod + `AUTH_URL` + `NEXT_PUBLIC_SITE_URL`.**
4. **Hosting nuevo** y variables de entorno (sin cuentas de Ginna).
5. **Pasarela de pago** (cuando decidas cuál; ePayco está aplazado).
6. **QA Fase 8:** build, recorrido visual, grep Ginna en UI.
7. **Extras de marca:** SVG logo, redes, confirmar WhatsApp, OpenAI en el servidor de producción.
8. **Opcional producto:** checkout con el mismo header/topbar; pedidos guest → cuenta; fotos de accesorios clicables por tipo.

---

## 5. Confirmaciones que siguen abiertas (guía §10)

1. Tipografía sans exacta del diseñador (hoy Nunito).
2. Vector del logo.
3. HEX dorado / morado título si hay valores de diseño.
4. Catálogo = solo capilar + accesorios + mayorista (**ya lanzamos así**).
5. Redes sociales.
6. Dominio final.
7. Envío gratis / mínimo de compra: **no hay** en PDF; no inventar.
8. Precios actualizados del catálogo.

---

## 6. Cómo actualizar este archivo

Cuando cerremos un punto, márcalo **Hecho** aquí y, si es de cuentas, también en `docs/07-cuentas-de-servicio.md`.  
No uses este doc como lista de tareas de Cursor por sí solo: es el **tablero** para no perder de vista lanzamiento vs. pulido visual.
