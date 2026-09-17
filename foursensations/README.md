# Four Sensations — Next.js (tienda online)

## Arranque local

```bash
cd foursensations
copy .env.example .env.local
# Edita .env.local: AUTH_SECRET, DATABASE_URL, DIRECT_URL (Neon propio de Four Sensations)
npm install
npx prisma generate
npm run dev
```

- Tienda: [http://localhost:3000](http://localhost:3000)
- Admin (redirige a login si no hay sesión): [http://localhost:3000/admin](http://localhost:3000/admin) · login directo: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### Variables de entorno (`.env` vs `.env.local`)

- El archivo **debe estar en la carpeta `foursensations/`** (junto a `package.json`), no solo en la raíz del repo.
- **` .env.local` tiene prioridad** sobre `.env` (el proyecto también carga ambos al arrancar Auth y Prisma vía `lib/load-env.ts`).
- Tras **cualquier cambio** en `.env.local`, **detén y vuelve a ejecutar** `npm run dev`.
- Comprobación en desarrollo (no muestra secretos): abre [http://localhost:3000/api/dev/env-check](http://localhost:3000/api/dev/env-check) y revisa `hasAuthSecret`, `hasDatabaseUrl`, etc.

### Login admin (desarrollo)

El panel usa **solo** el usuario **ADMIN** en PostgreSQL (email + contraseña hasheada con bcrypt), creado con `npm run db:seed` y las variables `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` en `.env.local`. Detalle en `docs/ADMIN_AUTH.md`.

### Imágenes de producto (Bunny)

Variables `BUNNY_*` y checklist de pruebas: `docs/BUNNY_IMAGES.md`.

## Estructura clave

| Origen legacy | Destino Next |
|---------------|----------------|
| `style.css` | `app/design-system.css` + imports en `app/globals.css` |
| Estilos inline `index.html` | `app/store-page-overrides.css` |
| Estilos inline `admin.html` | `app/admin-overrides.css` (`.admin-app-shell` en lugar de `body`) |
| `index.html` cuerpo | `app/(store)/page.tsx` + `components/store/StoreHomeClient.tsx` |
| `main.js` | Lógica en `StoreHomeClient` + `lib/*` + `hooks/useReveal.ts` |
| `admin.html` | `components/admin/AdminApp.tsx` + rutas `app/admin/*` |
| `PRODUCTS_DB` | `data/mock-products.ts` → `getStorefrontProducts()` (Prisma cuando hay DB) |

## Despliegue (Render)

Four Sensations usará un servicio Render **nuevo**. No conectes este folder al deploy de GinnaBeauty.

**No hagas `git push origin`** mientras `origin` sea `leofullstack7/ginnabeauty.git`. El alta de Git/Render propios es la fase 7 (`../docs/07-cuentas-de-servicio.md`).

## Scripts

- `npm run dev` — desarrollo
- `npm run build` — producción
- `npm run db:generate` — Prisma Client
- `npm run db:push` — sincronizar esquema (desarrollo)
- `npm run db:studio` — Prisma Studio
- `npm run db:seed` — datos iniciales (`prisma/seed.ts`; requiere `SEED_ADMIN_PASSWORD` en `.env.local`)

### Neon / pooler (P2028, transacciones)

- **`DATABASE_URL`**: conexión **con pooler** (p. ej. endpoint `-pooler.neon.tech` o parámetros de PgBouncer) para la app Next.js.
- **`DIRECT_URL`**: conexión **directa** al mismo proyecto Neon (sin pooler). Prisma la usa en `db push` / migraciones; el **seed** también se conecta por `DIRECT_URL` si existe, para evitar errores de transacción con el pooler.
- En **PostgreSQL local** sin pooler, puedes poner **la misma URL** en `DATABASE_URL` y `DIRECT_URL`.

**Variables de Prisma:** el esquema exige **`DIRECT_URL`** además de **`DATABASE_URL`**. Debes definirlas en **`.env.local`** (o en `.env`).

**Comandos:** usa **`npm run db:push`**, **`npm run db:generate`**, etc. (no `npx prisma ...` a pelo): los scripts cargan **`.env` y luego `.env.local`** con `dotenv-cli`, así no falla P1012 si solo tienes las URLs en `.env.local`.

Si ejecutas `npx prisma db push` manualmente, Prisma no lee `.env.local` → define **`DIRECT_URL` en `.env`** o exporta ambas variables en la terminal.

- CRUD admin de productos (API + panel): `docs/ADMIN_PRODUCTS_CRUD.md`

La plantilla HTML/docs de GinnaBeauty está en `../referencia/ginnabeauty/` (solo lectura).
