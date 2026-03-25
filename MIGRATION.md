# Migración GinnaBeauty → Next.js (preservación visual)

## 1. Auditoría — qué conservar del frontend original

### Identidad visual (no negociable)

- **Paleta y tokens CSS** (`:root` en `style.css`): `--ivory`, `--cream`, `--blush`, `--rose`, `--dusty-rose`, `--sage`, `--lavender`, `--gold`, `--dark`, sombras, radios, transiciones.
- **Tipografías**: Cormorant Garamond (display), DM Sans (body), Playfair (acentos en testimonios) vía Google Fonts en el design system.
- **Tienda pública**
  - Topbar oscuro con copy de envío.
  - Header sticky, logo 🌸 + “Ginna*Beauty*”, mega menú, barra de búsqueda, iconos carrito/favoritos/cuenta.
  - Hero con gradiente, orbes animados (`floatOrb`), stats inferiores, CTA primarios/secundarios.
  - Marquee oscuro, strip de categorías con cards e iconos gradiente.
  - Trust section 4 columnas.
  - Promo grid (3 cards, una wide oscura).
  - Sección productos: eyebrow, título con *em*, chips de filtro, select ordenar, grid de `product-card` (placeholder emoji, badges, precios tachados, estrellas).
  - Lifestyle grid asimétrico, testimonios, newsletter oscuro, footer multicolumna + chips de pago.
  - Overlays: carrito lateral, modal producto, auth, checkout, búsqueda fullscreen, toasts.
- **Admin**
  - Fondo `#F8F4F2`, layout 260px sidebar + main.
  - Sidebar oscuro, links con estado activo rosa/blush, chip usuario.
  - Topbar blanca, stats cards con esquinas decorativas, charts bar/donut, tablas `admin-table`, tabs, formularios `form-input`, modales `admin-modal`, toasts.

### Comportamiento a conservar

- Filtrado por categoría / subcategoría (mega menú y chips).
- Ordenación del grid.
- Carrito con umbral de envío gratis ($100.000 → envío $0).
- Modal detalle producto con breadcrumbs simulados.
- Admin: navegación entre módulos, tabs productos (lista / alta / bulk), modales venta y edición.

---

## 2. Estrategia de migración sin romper diseño

1. **Copiar CSS primero** — Un solo design system + hojas de “overrides” equivalentes a los `<style>` inline del HTML.
2. **Maquetar en JSX 1:1** — Mismas clases, mismos contenedores; evitar componentes genéricos de librerías UI.
3. **Hidratar con cliente solo donde hace falta** — Carrito, modales, búsqueda, filtros: `StoreHomeClient` (`"use client"`).
4. **Datos** — Server Component `page.tsx` llama `getStorefrontProducts()`; hoy cae en mock si no hay `DATABASE_URL`.
5. **Auth admin** — Auth.js + credenciales bootstrap (env) o usuario en DB; sin volver al login por contraseña en claro en el cliente.

---

## 3. Mapeo de archivos

| Legacy | Next.js |
|--------|---------|
| `index.html` (cuerpo) | `app/(store)/page.tsx` + `components/store/StoreHomeClient.tsx` |
| `admin.html` | `app/admin/page.tsx` + `components/admin/AdminApp.tsx` |
| `style.css` | `app/design-system.css` |
| Inline tienda | `app/store-page-overrides.css` |
| Inline admin | `app/admin-overrides.css` |
| `main.js` | `StoreHomeClient`, `lib/format.ts`, `lib/category-labels.ts`, `lib/menu-config.ts`, `hooks/useReveal.ts`, `data/mock-products.ts` |

---

## 4. Fases y estado

| Fase | Contenido | Estado |
|------|-----------|--------|
| **A** | Next App Router, TS, CSS migrado, home visual | Hecho (`web/`) |
| **B** | Lógica modular TS, mock tipado, carrito en `localStorage` | Hecho |
| **C** | Admin layout visual + estado en memoria (sin localStorage catálogo) | Hecho |
| **D** | Prisma + API + Auth producción + Bunny + quitar mocks | Parcial (esquema, `getStorefrontProducts`, `/api/products`, Auth bootstrap) |

### Pendiente Fase D (siguientes pasos)

- Sembrar DB (`prisma db push` / migraciones) y script de seed alineado a `mock-products`.
- CRUD admin vía Route Handlers (`/api/admin/...`) con rol `ADMIN`.
- Sincronizar menú tienda con `SiteMenu` o endpoint.
- Subida imágenes a Bunny + URLs en `Product.imageUrl`.
- Páginas SEO `/producto/[slug]` con `generateMetadata` y JSON-LD.
- Sustituir login demo de la tienda por `signIn` de proveedores reales.

---

## 5. Archivos estáticos de imágenes

Copia `producto*.jpg` (si los usas) desde la raíz del proyecto legacy a `web/public/` cuando quieras servir fotos reales; el grid actual usa **emoji** como en el mock original.
