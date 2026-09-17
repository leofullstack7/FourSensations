# Autenticación del panel administrativo

## Fuente de verdad del login

| Antes | Ahora |
|--------|--------|
| Credenciales en DB **o** variables `ADMIN_BOOTSTRAP_*` | **Solo** usuario `ADMIN` en la base de datos (`User.passwordHash` con bcrypt) |

- **Auth.js (NextAuth v5)** con proveedor `credentials` en `auth.ts`.
- `authorize` busca por email (insensible a mayúsculas), exige `role === ADMIN` y valida la contraseña con `bcrypt.compare`.
- El usuario inicial se crea con **`npm run db:seed`** (`prisma/seed.ts`), usando `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` del entorno en el momento del seed.

## Rutas y protección

| Ruta | Comportamiento |
|------|----------------|
| `/admin/login` | Pública: formulario de acceso (mismo diseño que antes). |
| `/admin` | Requiere sesión JWT con `role === ADMIN`; si no, redirección a `/admin/login` (middleware + comprobación en servidor en `app/admin/page.tsx`). |
| `/api/admin/*` | **401** sin sesión válida; **403** si la sesión no es `ADMIN`. Protección en **`middleware.ts`** y, en profundidad, **`requireAdminApi()`** al inicio de cada route handler. |

Archivos clave:

- `auth.ts` — configuración NextAuth, `pages.signIn: "/admin/login"`.
- `middleware.ts` — matcher `/admin`, `/admin/:path*`, `/api/admin/:path*`; usa `getToken` de `next-auth/jwt` (compatible con Edge; no importa `auth.ts` para no arrastrar Prisma/`node:path`).
- `lib/server/require-admin-api.ts` — `auth()` + respuestas JSON con `no-store`.
- `components/admin/AdminLoginForm.tsx` — UI de login.
- `app/admin/login/page.tsx` — página de login.
- `app/admin/page.tsx` — panel (server redirect si no hay sesión admin).

## Credenciales esperadas en desarrollo

1. En `web/.env.local`: `AUTH_SECRET`, `DATABASE_URL`, y para el seed `SEED_ADMIN_PASSWORD` (≥ 8 caracteres); opcional `SEED_ADMIN_EMAIL` (por defecto `admin@ginnabeauty.local`).
2. Ejecutar `npm run db:seed` (desde `web/`) al menos una vez para crear/actualizar el admin.
3. En **http://localhost:3000/admin/login** usar:
   - **Usuario** = valor de `SEED_ADMIN_EMAIL` que quedó en la tabla `User` (o el que veas en Prisma Studio).
   - **Contraseña** = el **valor** de `SEED_ADMIN_PASSWORD` **del momento en que corriste el seed** (si cambias la variable después, vuelve a ejecutar el seed o cambia el hash en DB).

**Eliminado:** `ADMIN_BOOTSTRAP_USER` / `ADMIN_BOOTSTRAP_PASSWORD` (ya no se leen en `auth.ts`). Puedes borrarlos de tu `.env.local` si los tenías.

## Archivos modificados o nuevos (esta fase)

| Archivo | Cambio |
|---------|--------|
| `auth.ts` | Sin bootstrap; `signIn` en `/admin/login`. |
| `middleware.ts` | **Nuevo**: protege `/admin` (excepto login) y `/api/admin/*`. |
| `lib/server/require-admin-api.ts` | **Nuevo**. |
| `app/admin/page.tsx` | Server Component con `auth()` + `redirect`. |
| `app/admin/login/page.tsx` | **Nuevo**. |
| `components/admin/AdminLoginForm.tsx` | **Nuevo** (login extraído del panel). |
| `components/admin/AdminApp.tsx` | Sin formulario de login; redirección cliente; `signOut` → `/admin/login`. |
| `app/api/admin/**/route.ts` | Llamada a `requireAdminApi()` en cada método. |
| `app/api/dev/env-check/route.ts` | Sin campos bootstrap. |
| `.env.example`, `README.md` | Documentación alineada. |

## Qué probar manualmente

1. **Sin cookies**: abrir `/admin` → debe ir a `/admin/login` (o mostrar login según redirección).
2. **Login incorrecto** → mensaje de error en el formulario.
3. **Login con admin del seed** → acceso a `/admin` y carga de productos/categorías.
4. **Salir** → debe terminar en `/admin/login`; `/admin` de nuevo pide login.
5. **API sin cookie**: en el navegador (pestaña privada) o `curl` sin cabeceras de sesión → `GET /api/admin/products` → **401** JSON `{ "error": "No autorizado" }`.
6. **Usuario CUSTOMER** (si tienes uno en DB con contraseña): iniciar sesión y visitar `/admin` → redirección a login con aviso de permisos (`?error=forbidden`); llamada a `/api/admin/...` → **403** `{ "error": "Prohibido" }`.
7. **Sesión admin**: las operaciones CRUD del panel siguen funcionando (cookies `credentials: "include"` en los clientes existentes).

## Notas

- `/api/auth/*`, `/api/products` (tienda) y `/api/dev/env-check` no están cubiertos por el matcher de admin.
- Rotar `AUTH_SECRET` invalida sesiones JWT existentes.
