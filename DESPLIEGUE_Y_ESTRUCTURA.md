# GinnaBeauty — Guía técnica de despliegue y estructura

Documento de referencia para clonar, configurar y desplegar el proyecto en **otro equipo**.  
La aplicación vive en la carpeta **`web/`** (Next.js 14). El repositorio Git está en la raíz **`Ginna/`**.

---

## 1. Resumen del stack

| Capa | Tecnología |
|------|------------|
| Frontend / Backend | [Next.js 14](https://nextjs.org/) (App Router) + React 18 + TypeScript |
| Base de datos | PostgreSQL ([Neon](https://neon.tech/) en producción) |
| ORM | Prisma 6 |
| Auth admin | Auth.js (NextAuth v5) + bcrypt |
| Auth clientes | Google OAuth + email/contraseña (API propia) |
| Imágenes catálogo | Bunny Storage + Pull Zone (CDN) |
| Pagos | ePayco (Apify + webhooks) y Bold (checkout embebido) |
| Email transaccional | Resend |
| Hosting | **Render** (despliegue desde GitHub) |
| Repo | `https://github.com/leofullstack7/ginnabeauty.git` — rama **`main`** |

---

## 2. Estructura del repositorio

```
Ginna/                          ← Raíz del repo Git
├── DESPLIEGUE_Y_ESTRUCTURA.md    ← Este archivo
├── MIGRATION.md                  ← Auditoría migración legacy → Next
├── igora/                        ← Assets locales Igora (NO en Git). Ver §10
└── web/                          ← **Proyecto Next.js (trabajar aquí)**
    ├── app/                      ← Rutas App Router
    │   ├── (store)/              ← Tienda pública (home, categorías, checkout, legales)
    │   ├── admin/                ← Panel admin (login + dashboard)
    │   ├── api/                  ← Route Handlers (REST)
    │   ├── design-system.css     ← Tokens y estilos base (legacy style.css)
    │   ├── store-page-overrides.css
    │   ├── admin-overrides.css
    │   └── globals.css           ← Imports globales
    ├── components/
    │   ├── store/                ← UI tienda (home, carrito, tintes, checkout…)
    │   └── admin/                ← UI admin (productos, bulk import, combos…)
    ├── lib/                      ← Lógica de negocio, Prisma, APIs cliente, bulk import
    ├── hooks/                    ← Hooks React (useReveal, useBufferedProgress…)
    ├── prisma/
    │   ├── schema.prisma         ← Esquema DB
    │   └── seed.ts               ← Usuario admin inicial
    ├── scripts/                  ← Utilidades (limpieza .next, migraciones, imágenes igora)
    ├── docs/                     ← Documentación detallada por módulo
    ├── tintes/                   ← Referencia diseño/UI tintes (no es runtime)
    ├── data/mock-products.ts     ← Fallback si no hay DATABASE_URL
    ├── .env.example              ← Plantilla de variables
    ├── package.json
    └── next.config.mjs
```

---

## 3. Requisitos en un PC nuevo

- **Node.js** 20 LTS (recomendado; compatible con 18+)
- **npm** (incluido con Node)
- **Git**
- Cuenta **GitHub** con acceso al repo
- Cuenta **Neon** (PostgreSQL) — URLs de conexión pooled + directa
- Opcional: **Prisma Studio** vía `npm run db:studio`

---

## 4. Configuración inicial (clonar y arrancar)

```bash
git clone https://github.com/leofullstack7/ginnabeauty.git
cd ginnabeauty/web

cp .env.example .env.local
# Editar .env.local con valores reales (ver §5)

npm install
npm run db:generate
npm run db:push          # Sincroniza schema con Neon/local
npm run db:seed          # Crea usuario admin (requiere SEED_ADMIN_PASSWORD)

npm run dev              # http://localhost:3000
```

### URLs locales

| URL | Descripción |
|-----|-------------|
| http://localhost:3000 | Tienda (home) |
| http://localhost:3000/admin | Panel admin (redirige a login) |
| http://localhost:3000/admin/login | Login admin |
| http://localhost:3000/api/dev/env-check | Comprueba qué env vars están cargadas (solo dev) |

### Si el menú o categorías no se actualizan en local

```bash
npm run dev:clean
```

Borra caché `.next` y reinicia. En desarrollo el menú de categorías **no usa caché** de 1 h.

### Windows + OneDrive

El proyecto suele vivir en OneDrive. Si aparecen errores de chunks webpack (`Cannot find module './xxxx.js'`), usar **`npm run dev:clean`**. En `next.config.mjs` la caché webpack está desactivada en dev por este motivo.

---

## 5. Variables de entorno

**Ubicación obligatoria:** `web/.env.local` (junto a `package.json`).  
**Prioridad:** `.env.local` > `.env`.  
**Tras cualquier cambio:** reiniciar `npm run dev`.

Copiar desde `web/.env.example`. Resumen:

### Base de datos (obligatorio)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Conexión **con pooler** (Neon: host `-pooler` o `?pgbouncer=true`) |
| `DIRECT_URL` | Conexión **directa** (migraciones, `db push`, seed). En local sin pooler puede ser igual que `DATABASE_URL` |

### Auth

| Variable | Uso |
|----------|-----|
| `AUTH_SECRET` | Secreto JWT Auth.js (string largo aleatorio) |
| `AUTH_TRUST_HOST` | `true` en producción Render |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Login Google clientes tienda |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Solo para `npm run db:seed` (admin inicial) |

### Sitio público

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SITE_URL` | URL canónica, ej. `https://ginnabeauty.com` |

### Bunny CDN (imágenes producto)

| Variable | Uso |
|----------|-----|
| `BUNNY_STORAGE_API_KEY` | Password del Storage Zone |
| `BUNNY_STORAGE_ZONE_NAME` | Nombre de la zona |
| `BUNNY_STORAGE_REGION` | Región (`br`, `ny`, etc.) |
| `BUNNY_CDN_BASE_URL` | Pull Zone, ej. `https://xxx.b-cdn.net` |

Detalle: `web/docs/BUNNY_IMAGES.md`

### ePayco

| Variable | Uso |
|----------|-----|
| `EPAYCO_PUBLIC_KEY` / `EPAYCO_PRIVATE_KEY` | Llaves Apify |
| `EPAYCO_TEST` | `true` sandbox / `false` producción |
| `EPAYCO_CUSTOMER_ID` / `EPAYCO_P_KEY` | Firma webhooks |
| `EPAYCO_RESPONSE_URL` / `EPAYCO_CONFIRMATION_URL` | Callbacks (o derivados de `NEXT_PUBLIC_SITE_URL`) |

Detalle: `web/docs/EPAYCO_SANDBOX_VALIDATION.md`

### Bold

| Variable | Uso |
|----------|-----|
| `BOLD_SECRET_KEY` | Servidor (webhooks) |
| `NEXT_PUBLIC_BOLD_API_KEY` | Cliente embebido |

### Resend (emails de pedido)

| Variable | Uso |
|----------|-----|
| `RESEND_API_KEY` | API key |
| `RESEND_FROM_EMAIL` | Remitente |
| `RESEND_NOTIFY_EMAIL` | Notificación interna |

**Importante:** `.env` y `.env.local` están en `.gitignore`. **Nunca commitear secretos.**

---

## 6. Base de datos (Prisma)

### Comandos (siempre desde `web/`)

```bash
npm run db:generate   # Regenera Prisma Client tras cambios en schema
npm run db:push       # Aplica schema a DB (desarrollo)
npm run db:studio     # UI visual de tablas
npm run db:seed       # Admin + datos iniciales
```

Usar **`npm run db:*`**, no `npx prisma` a pelo: los scripts cargan `.env` + `.env.local` con `dotenv-cli`.

### Modelos principales

- **Product** — catálogo (`category`, `subcategory`, `imageUrl`, `featuredInHome`, campos tintes: `tintLevel`, `tintFamilyId`, `tintTypeId`…)
- **ProductImage** — galería
- **TintFamily** / **TintType** — catálogo maestro tintes
- **Category** / **Subcategory** — menú tienda
- **BulkImportJob** — jobs carga masiva CSV+ZIP
- **Order** — pedidos checkout
- **User** — admin (`role: ADMIN`) y clientes

Esquema completo: `web/prisma/schema.prisma`

---

## 7. Arquitectura de la aplicación

### Rutas tienda (`app/(store)/`)

| Ruta | Componente clave |
|------|------------------|
| `/` | `StoreHomeClient` — home, destacados, preview tintes |
| `/categoria/[slug]` | Landing genérico o **`TintCategoryPageClient`** si `slug === tintes` |
| `/checkout` | Checkout ePayco/Bold |
| `/checkout/resultado` | Resultado pago |
| Páginas legales | `politicas-envio`, `politicas-privacidad`, `terminos-condiciones` |

### Rutas admin

| Ruta | Protección |
|------|------------|
| `/admin/login` | Pública |
| `/admin` | Middleware + rol `ADMIN` |
| `/api/admin/*` | Middleware JSON 401/403 |

Archivos: `web/middleware.ts`, `web/auth.ts`, `web/lib/server/require-admin-api.ts`

### APIs públicas relevantes

- `GET /api/products` — catálogo JSON
- `POST /api/checkout/orders` — crear pedido
- `POST /api/payments/epayco/*` — sesión y webhooks
- `POST /api/payments/bold/*` — integridad y confirmación

### Capa `lib/`

| Carpeta / archivo | Responsabilidad |
|-------------------|-----------------|
| `lib/products.ts` | Catálogo tienda (`getStorefrontProducts`, caché ISR 5 min) |
| `lib/store-categories.ts` | Menú categorías desde DB |
| `lib/tints.ts` | Productos tintes → burbujas home/categoría |
| `lib/storefront-product-order.ts` | Mezcla inteligente destacados home |
| `lib/bulk-import/*` | Parser CSV, ZIP, preview, tintes |
| `lib/server/bunny-storage.ts` | Subida imágenes |
| `lib/cart-storage.ts` / `favorites-storage.ts` | localStorage cliente |

### Componentes tintes (`components/store/tints/`)

Experiencia visual categoría Tintes + preview home. Referencia original en `web/tintes/README_INTEGRACION.md`.

---

## 8. Scripts npm

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Desarrollo |
| `npm run dev:clean` | Borra `.next` + dev (recomendado tras cambios de caché/menú) |
| `npm run build` | Build producción |
| `npm run start` | Servidor producción (post-build) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Prisma generate |
| `npm run db:push` | Prisma db push |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Seed admin |
| `npm run migrate:proaging` | Migración datos Proaging ( puntual ) |
| `npm run migrate:cuidado-facial` | Migración cuidado facial ( puntual ) |

### Scripts en `web/scripts/` (Node, uso manual)

| Script | Uso |
|--------|-----|
| `clean-next.mjs` | Limpia carpeta `.next` |
| `convert-png-to-webp.mjs` | PNG → WebP (assets igora) |
| `process-igora-tint-folder.mjs` | Renombrar `_color` + convertir principales |
| `list-categories.mjs` | Listar categorías DB |
| `migrate-proaging.ts` / `migrate-cuidado-facial.ts` | Migraciones taxonomía |

---

## 9. Despliegue en Render

Flujo estándar del proyecto:

1. Desarrollar y probar en local (`npm run dev`, `npm run build` opcional).
2. Commit y push a **`main`**:
   ```bash
   git add .
   git commit -m "Descripción del cambio"
   git push origin main
   ```
3. **Render** detecta el push y despliega el servicio web (automático o manual según configuración del servicio en el panel Render).

### Checklist pre-deploy

- [ ] `npm run build` pasa sin errores en local
- [ ] Variables de entorno configuradas en el panel Render (mismas que `.env.local`, con valores de **producción**)
- [ ] `DATABASE_URL` / `DIRECT_URL` apuntan a Neon producción
- [ ] `NEXT_PUBLIC_SITE_URL` = dominio real
- [ ] `EPAYCO_TEST=false` en producción
- [ ] `AUTH_SECRET` definido y estable (no cambiar sin cerrar sesiones)
- [ ] Bunny CDN con Pull Zone activa

### Caché en producción

- Catálogo productos: `unstable_cache` 5 min (`storefront-products-v2`)
- Páginas store: `revalidate = 300` en varias rutas
- Tras cambios de schema DB en producción: ejecutar `db push` contra Neon prod (con cuidado) o pipeline acordado

---

## 10. Assets fuera de Git

### Carpeta `igora/` (raíz repo)

Imágenes de muestras tintes Igora (WebP, convención `nivel.webp` + `nivel_color.webp`).  
**No está trackeada en Git** — copiar manualmente al clonar en otro PC o desde backup/OneDrive.

Procesamiento local:

```bash
cd web
node scripts/process-igora-tint-folder.mjs "../igora/zero" "../igora/IRA" "../igora/Color 10" "../igora/silver white"
```

Las imágenes finales se suben al catálogo vía **admin → carga masiva CSV+ZIP** o importación manual; Bunny almacena las URLs públicas.

---

## 11. Funcionalidades admin clave

| Módulo | Doc |
|--------|-----|
| Login / sesión | `web/docs/ADMIN_AUTH.md` |
| CRUD productos | `web/docs/ADMIN_PRODUCTS_CRUD.md` |
| CRUD categorías | `web/docs/ADMIN_CATEGORIES_CRUD.md` |
| Carga masiva CSV+ZIP | `web/docs/BULK_IMPORT_CSV_ZIP_PHASE2.md` |
| Tintes (tipo+familia, matching) | Lógica en `lib/bulk-import/tintes.ts`, `tint-catalog.ts` |
| Combos | Panel `AdminCombosPanel` |
| Imágenes Bunny | `web/docs/BUNNY_IMAGES.md` |

### Carga masiva tintes (resumen)

1. CSV + ZIP con imágenes por nivel/código.
2. Modal **tipo + familia** antes del matching (evita colisión IR/IRA/SW).
3. Columna **Marca** = familia si no hay columna Familia.
4. Imágenes `*_color.webp` emparejan al mismo nivel.

---

## 12. Pagos y checkout

- Checkout UI: `components/store/CheckoutPageClient.tsx`
- Creación pedido: `lib/server/checkout/create-order.ts`
- ePayco: `lib/server/epayco/`, webhooks en `app/api/payments/epayco/`
- Bold: `app/api/payments/bold/`
- **No modificar flujos de pago** sin probar en sandbox (`EPAYCO_TEST=true`)

---

## 13. Estilos y diseño

| Archivo | Contenido |
|---------|-----------|
| `app/design-system.css` | Tokens CSS, tipografías, componentes base |
| `app/store-page-overrides.css` | Overrides tienda (hero, grid, cards…) |
| `app/admin-overrides.css` | Panel admin |
| `components/store/tints/tints.css` | UI categoría tintes |

Fuentes: Cormorant Garamond, DM Sans, Playfair (Google Fonts en design system).

---

## 14. Solución de problemas frecuentes

| Problema | Solución |
|----------|----------|
| P1012 Prisma / falta `DIRECT_URL` | Definir en `.env.local`; usar `npm run db:push` |
| P2028 transacción pooler Neon | Usar `DIRECT_URL` para seed/migraciones |
| Admin login falla | Re-ejecutar `npm run db:seed`; verificar email/password del seed |
| Menú sin categoría nueva en local | `npm run dev:clean` |
| Chunks webpack rotos (Windows) | `npm run dev:clean` |
| Imágenes no cargan | Verificar `BUNNY_*` y `remotePatterns` en `next.config.mjs` |
| ePayco webhook rechazado | Revisar `EPAYCO_CUSTOMER_ID`, `EPAYCO_P_KEY`, URLs confirmation |
| Build falla en Render | Revisar logs; ejecutar `npm run build` local primero |

---

## 15. Índice de documentación adicional

| Archivo | Tema |
|---------|------|
| `web/README.md` | Arranque rápido |
| `MIGRATION.md` | Historia migración HTML → Next |
| `web/docs/ADMIN_AUTH.md` | Auth admin |
| `web/docs/BUNNY_IMAGES.md` | CDN imágenes |
| `web/docs/BULK_IMPORT_CSV_ZIP_PHASE1.md` | Diseño bulk import |
| `web/docs/BULK_IMPORT_CSV_ZIP_PHASE2.md` | Bulk import implementado |
| `web/docs/EPAYCO_SANDBOX_VALIDATION.md` | ePayco sandbox |
| `web/tintes/README_INTEGRACION.md` | UI tintes referencia |

---

## 16. Contacto / convenciones de equipo

- **Rama principal:** `main`
- **Commits:** mensajes en español, descriptivos del *porqué*
- **Código app:** TypeScript estricto, componentes tienda en `components/store/`, admin en `components/admin/`
- **No commitear:** `.env.local`, carpeta `igora/`, `.next/`, `node_modules/`
- **Producción:** dominio público configurado en Render + variables de entorno del panel (no las del `.env.local` de desarrollo)

---

*Última actualización: junio 2026 — refleja estado post-integración Tintes, mezcla home destacados, despliegue Render + Neon.*
