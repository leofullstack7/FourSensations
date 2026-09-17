# 07 — Cuentas de servicio (Four Sensations)

**Estado:** en curso · **Quién lo hace:** tú (altas y pagos) + yo (pegar variables en local, Prisma, checklist).  
**Objetivo:** que Four Sensations tenga **infraestructura propia**. Cero reutilización de GinnaBeauty.

No copies URLs, llaves ni proyectos de Ginna. Si algo ya está en `foursensations/.env` o `.env.local` y apunta a Neon/ePayco/dominio de Ginna, **se reemplaza**, no se “aprovecha”.

---

## Cómo vamos a trabajar este archivo

Avanzamos **un punto por vez**. En el chat dime el número (ej. “hagamos el 07.2”) o “listo el 07.1, sigue”.  
Cuando termines un punto, lo marcamos aquí juntos.

Checklist vivo:

- [x] 07.1 Aislar Git (repo propio, sin push a Ginna)
- [x] 07.2 Neon PostgreSQL nuevo
- [x] 07.3 `.env.local` limpio + AUTH_SECRET + admin seed
- [x] 07.4 Prisma: `db push` y seed **solo** en el Neon nuevo
- [ ] 07.5 Dominio y `NEXT_PUBLIC_SITE_URL` — **pendiente (mañana)** · local sigue en `http://localhost:3000`
- [x] 07.6 Google OAuth (clientes) — **localhost listo**; falta añadir `https://TU-DOMINIO` en Google Console cuando exista
- [x] 07.7 Bunny CDN (imágenes) — no requiere dominio
- [ ] 07.8 Pasarela de pago — **aplazado**: no ePayco ahora; otra pasarela más adelante (no Ginna)
- [ ] 07.9 Bold — **omitido** salvo que lo pidas después
- [x] 07.10 Resend — **API key en local**; SPF/DKIM **espera dominio (07.5)**
- [ ] 07.11 WhatsApp — **pendiente** (número oficial en env: `573043632492`; confirmar / cambiar después)
- [ ] 07.12 OpenAI (asesor / fichas; opcional) — no requiere dominio
- [ ] 07.13 Hosting Render **nuevo** — se puede crear el servicio; **dominio custom y `NEXT_PUBLIC_SITE_URL=https://…` esperan 07.5**
- [ ] 07.14 Prueba local: env-check + home + admin login — no requiere dominio

**Cuando mañana tengas el dominio**, dime la URL `https://…` y cerramos de un tiro: 07.5 + callbacks Google (07.6) + URLs ePayco (07.8) + Resend from (07.10) + env de Render (07.13).

Plantilla de variables (sin secretos): `foursensations/.env.example`

La app Next.js vive en **`foursensations/`** (ya no en `web/`). GinnaBeauty está en **`referencia/ginnabeauty/`**.

---

## 07.1 — Git propio (antes que cualquier deploy)

**Por qué:** el `origin` actual es `https://github.com/leofullstack7/ginnabeauty.git`. Un `git push` publicaría Four Sensations **encima** de GinnaBeauty. Está prohibido.

**Tú haces:**

1. Crea un repositorio **nuevo** en GitHub, vacío, por ejemplo `foursensations` o `foursensations-web`, en la org/cuenta que corresponda a la marca (no el de Ginna).
2. No inicialices README en GitHub si ya tenemos archivos locales (evita conflictos).
3. Avísame la URL `https://github.com/USUARIO/REPO.git`.

**Yo hago (cuando me pases la URL):**

- Añadir `git remote add foursensations <url>` (o renombrar origin con cuidado).
- Dejar `origin` de Ginna **sin usar**, o quitarlo del working copy de este folder.
- Primer push **solo** al remote nuevo: `main` de Four Sensations.
- Confirmar que `.env` / `.env.local` **no** entran al commit (ya están en `.gitignore`).

**No hagas** `git push origin main` mientras origin sea Ginna.

---

## 07.2 — Neon (PostgreSQL) nuevo

GinnaBeauty ya usa Neon. Four Sensations necesita **otro proyecto**.

**Tú haces:**

1. Entra a [https://console.neon.tech](https://console.neon.tech) con una cuenta de Four Sensations S.A.S. (no la personal de Ginna, si son distintas).
2. **New Project**
   - Nombre: `foursensations`
   - Región: la más cercana a Colombia que ofrezca Neon (a menudo `Ohio` / `us-east-1` está bien).
   - Postgres 16 o 17.
3. Crea una rama `production` o usa `main`.
4. Copia **dos** connection strings del mismo proyecto:
   - **Pooled** (pooler, puerto 5432 con host `*-pooler.*.neon.tech`) → `DATABASE_URL`
   - **Direct** (sin pooler) → `DIRECT_URL`
5. Añade `?sslmode=require` si no viene.
6. Pégame **solo** si quieres que yo las escriba en `.env.local` (no las subas a un ticket público ni a Git).

**Yo hago:**

- Poner `DATABASE_URL` y `DIRECT_URL` en `foursensations/.env.local`.
- Comprobar que **no** coinciden con el host del Neon de Ginna (nombre del endpoint distinto).

**Señal de error:** si el host sigue siendo el mismo `ep-….neon.tech` que Ginna, **paramos**.

---

## 07.3 — `.env.local` limpio

Archivo: `foursensations/.env.local` (junto a `package.json`). Nunca se commitea.

**Tú / yo juntos:**

```bash
cd foursensations
copy .env.example .env.local
```

Rellenar como mínimo:

| Variable | Valor Four Sensations |
|----------|------------------------|
| `DATABASE_URL` | Pooler del Neon **nuevo** |
| `DIRECT_URL` | Directo del Neon **nuevo** |
| `AUTH_SECRET` | String largo aleatorio (32+ chars). `openssl rand -base64 32` o generador. |
| `AUTH_TRUST_HOST` | `true` |
| `SEED_ADMIN_EMAIL` | p. ej. `admin@foursensations.local` o el correo real de Zoryn |
| `SEED_ADMIN_PASSWORD` | Contraseña ≥ 8 caracteres, **no** la de Ginna |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `573043632492` |
| `EPAYCO_MERCHANT_NAME` | `Four Sensations` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` hasta tener dominio |

El resto (Google, Bunny, ePayco, Bold, Resend, OpenAI) se llena en los puntos siguientes. Mientras tanto pueden quedar vacíos.

Tras **cualquier** cambio: parar y volver a `npm run dev`.

Comprobación (no imprime secretos):  
http://localhost:3000/api/dev/env-check

---

## 07.4 — Prisma solo contra el Neon nuevo

**Antes:** confirma en env-check / `.env.local` que el host Neon no es el de Ginna.

```bash
cd foursensations
npm install
npx prisma generate
npm run db:push
npm run db:seed
```

- `db:push` crea tablas en **Four Sensations**.
- `db:seed` crea el admin (`SEED_ADMIN_*`) y categorías de menú.

Si `db:push` pide confirmar reset o ves datos de productos Ginna, **stop**: estás en la base equivocada.

Login admin: http://localhost:3000/admin/login con el email/clave del seed.

---

## 07.5 — Dominio y URL pública

**Estado:** pendiente. Mañana habrá dominio. Local: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

**Tú eliges** el dominio (no aparece en los PDF). Ejemplos: `foursensations.com`, `.co`, etc.

Cuando lo tengas:

1. Compra/transfiere el dominio a nombre de Four Sensations.
2. Dime la URL canónica `https://…` (sin barra final; decide si va con o sin `www` y quédate con una).
3. Yo pongo `NEXT_PUBLIC_SITE_URL` y actualizo lo que dependa: Google, ePayco, Resend, Render.

Hasta entonces no bloqueamos el resto. En Render se puede usar `*.onrender.com` temporal.

---

## 07.6 — Google OAuth (login de **clientes**)

No reutilices el Client ID de GinnaBeauty: el callback apunta a `ginnabeauty.com`.

**Hoy (sin dominio):** registra **solo localhost**. Mañana añades el `https://TU-DOMINIO`.

**Tú haces** en [Google Cloud Console](https://console.cloud.google.com/):

1. Proyecto nuevo: `four-sensations-store`.
2. APIs → Credentials → OAuth consent screen (External, app de prueba está bien al inicio).
3. OAuth Client ID → Web application.
4. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - `https://TU-DOMINIO` (cuando exista)
5. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://TU-DOMINIO/api/auth/callback/google`
6. Copia `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

**Yo pego** en `.env.local`. Detalle técnico extra: `foursensations/docs/GOOGLE_OAUTH.md` (nombres de Ginna en ese doc son plantilla; los URIs reales son los de este punto).

---

## 07.7 — Bunny (fotos de producto)

Ginna tiene su Storage Zone / Pull Zone. Four Sensations necesita **zona nueva**.

**Tú haces** en [bunny.net](https://bunny.net/):

1. Storage Zone: `foursensations` (región p. ej. `BR` São Paulo o la más cercana).
2. Pull Zone CDN delante de esa storage.
3. Anota:
   - `BUNNY_STORAGE_API_KEY` (password FTP/API de la zona)
   - `BUNNY_STORAGE_ZONE_NAME`
   - `BUNNY_STORAGE_REGION` (`br`, `ny`, …)
   - `BUNNY_STORAGE_API_HOST` si el panel muestra un host raro (evita 401)
   - `BUNNY_CDN_BASE_URL` (`https://xxxx.b-cdn.net`)

**Yo:** variables en `.env.local` + prueba de subida desde admin. Guía técnica: `foursensations/docs/BUNNY_IMAGES.md`.

Sin Bunny, la tienda funciona con mocks / imágenes locales, pero el catálogo real no escala.

---

## 07.8 — Pasarela de pago (aplazado)

**No ePayco por ahora.** Four Sensations usará **otra pasarela**, más adelante. No reutilizar el comercio ni las llaves de Ginna.

Hasta entonces el checkout no cobra en producción. Las vars `EPAYCO_*` pueden quedar vacías.

---

## 07.9 — Bold (omitido)

No se configura. Llaves vacías.

---

## 07.10 — Resend (emails de pedido)

**Tú haces:**

1. Cuenta en [resend.com](https://resend.com/) de Four Sensations.
2. API key.
3. Dominio verificado (SPF/DKIM) cuando exista el dominio, para que no salga `onboarding@resend.dev`.
4. Variables:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` (ej. `Four Sensations <hola@TU-DOMINIO>`)
   - `RESEND_NOTIFY_EMAIL` (interno, avisos de pedido nuevo)

Hasta verificar dominio, Resend solo envía a la cuenta dueña. Está bien para pruebas.

---

## 07.11 — WhatsApp

**Estado:** pendiente. El valor en `.env.local` sigue siendo el de la guía (`573043632492`) hasta que lo confirmes o lo cambies.

---

## 07.12 — OpenAI (opcional)

Para el asesor de la tienda y textos de fichas en admin:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-4o-mini` (o el que elijan)

Sin key, el asesor usa reglas locales. No bloquea el lanzamiento.

---

## 07.13 — Render (servicio **nuevo**)

GinnaBeauty ya está en Render. **No** conectes este folder a ese servicio.

**Tú haces:**

1. New Web Service.
2. Conecta el **GitHub nuevo** del punto 07.1 (nunca el repo `ginnabeauty`).
3. Root directory: `foursensations` (si el repo es la raíz de este folder) **o** la raíz si el repo solo contiene la app.
4. Build: `npm install && npx prisma generate && npm run build`
5. Start: `npm run start`
6. Node 20.
7. Pega **todas** las env de producción (Neon prod, AUTH_SECRET distinto al de local, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_SITE_URL=https://…`, ePayco, Bunny, Resend, WhatsApp).
8. Tras el primer deploy: `prisma db push` (o migrate) contra el Neon de **producción FS**, no el de Ginna.

**Yo te armo** el listado de env de Render cuando 07.2–07.10 estén listos, para copiar/pegar.

---

## 07.14 — Cierre de la fase (QA mínimo)

Cuando los puntos que apliquen al “mínimo viable” estén (07.1–07.4 + WhatsApp; el resto puede ir después):

1. `cd foursensations && npm run dev`
2. `/api/dev/env-check` → `hasDatabaseUrl`, `hasAuthSecret` true; site URL no es ginnabeauty.com
3. Home: logo Four Sensations, menú capilar/accesorios/mayorista
4. `/admin/login` con el seed **nuevo**
5. Un producto de prueba (CSV o alta manual) **en el Neon nuevo**
6. Confirmación explícita: ningún `git push` a Ginna, ningún `db:push` al Neon viejo

---

## Datos oficiales (para formularios)

Úsalos tal cual en ePayco, Resend, dominio, facturación:

| Campo | Valor |
|-------|--------|
| Razón social | FOUR SENSATIONS S.A.S. |
| NIT | 901.038.691-2 |
| Dirección | Calle 65A #23A-15, Manizales, Caldas, Colombia |
| Email | atencionalcliente.befs@gmail.com |
| WhatsApp | +57 304 363 2492 |
| Horario | 9:00 a. m. – 6:00 p. m. |

---

## Qué no entra en esta fase

- Catálogo completo con precios vigentes (CSV `foursensations/docs/catalogo-foursensations-borrador.csv` se carga **después**, en el admin, contra el Neon nuevo).
- SVG del logo.
- Redes sociales.
- Push a GinnaBeauty.

---

## Siguiente mensaje útil

Empieza por **07.1** (Git) o **07.2** (Neon), el que puedas abrir hoy. Dime “vamos con 07.X” y lo hacemos juntos, un punto.
