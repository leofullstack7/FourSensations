# Imágenes de producto — Bunny Storage + CDN

## Modelo de datos

| Campo / tabla | Uso |
|---------------|-----|
| `Product.imageUrl` | URL pública (Pull Zone) de la **imagen principal**. Opcional; si falta, la tienda usa `emoji`. |
| `ProductImage` | Filas de **galería** (`url`, `sortOrder`). Se eliminan en cascada al borrar el producto. |

Los productos ya sembrados siguen igual: `imageUrl` null y sin filas en `ProductImage` → se muestra el emoji.

## Variables de entorno (`web/.env.local`)

| Variable | Obligatoria para subir | Descripción |
|----------|-------------------------|-------------|
| `BUNNY_STORAGE_API_KEY` | Sí | **Contraseña** del Storage Zone (panel Bunny → Storage → tu zona → FTP & API → Password). |
| `BUNNY_STORAGE_ZONE_NAME` o `BUNNY_STORAGE_ZONE` | Sí | Nombre exacto del Storage Zone. |
| `BUNNY_STORAGE_REGION` | Recomendada | Código de región de la zona: `de` (Frankfurt), `ny`, `la`, `uk`, `br` (São Paulo), `sg`, `se`, `jh`, `syd`. Debe coincidir con **Primary region** de la zona en el panel. |
| `BUNNY_STORAGE_API_HOST` | Opcional | Si sigues con **401**, copia aquí el hostname **exacto** de *FTP & HTTP API* (ej. `br.storage.bunnycdn.com`), sin `https://`. Tiene prioridad sobre `BUNNY_STORAGE_REGION`. |
| `BUNNY_CDN_BASE_URL` | Sí | URL base del **Pull Zone** **sin** barra final, ej. `https://tu-pullzone.b-cdn.net`. Es el prefijo de las URLs que se guardan en la DB. |

Sin estas variables, `POST /api/admin/upload` responde **503** y no podrás subir; crear/editar producto **sin** URL de CDN sigue funcionando.

### Tienes dos zonas (ej. Brasil y Nueva York)

Cada **Storage Zone** en Bunny tiene **su propia** región, **nombre** y **contraseña** (FTP & API).

Esta app usa **una sola zona a la vez** para subir desde el admin: todo va a la combinación que definas en `.env` / `.env.local`:

| Qué poner | Regla |
|-----------|--------|
| `BUNNY_STORAGE_ZONE_NAME` | El nombre de **la zona concreta** a la que quieres subir (no mezcles dos nombres). |
| `BUNNY_STORAGE_REGION` | La región de **esa misma zona**: `br` si la zona está en São Paulo, `ny` si está en Nueva York, etc. |
| `BUNNY_STORAGE_API_KEY` | La **Password** de **esa misma zona** (cada zona tiene su password; no es la misma que la otra). |
| `BUNNY_CDN_BASE_URL` | El **Pull Zone** que sirve los archivos de **esa** zona (normalmente uno por proyecto; si usas dos CDN distintos, hoy solo validamos un origen en `BUNNY_CDN_BASE_URL` — unifica en un Pull Zone o contacta para ampliar). |

**Resumen:** no es “Brasil **y** Nueva York en el mismo `.env`”, sino “elijo **esta** zona para las subidas del panel” y las variables deben ser **coherentes** con esa zona. Si mañana quieres usar solo la otra, cambia nombre + región + password (+ CDN si aplica) y reinicia el servidor.

Opcional: fija el host con `BUNNY_STORAGE_API_HOST` copiado del panel de **esa** zona (ej. `br.storage.bunnycdn.com` o `ny.storage.bunnycdn.com`).

## Qué configurar en Bunny (manual)

1. **Storage Zone**  
   - Crea una zona (o usa una existente).  
   - Copia el **nombre** de la zona → `BUNNY_STORAGE_ZONE_NAME`.  
   - En **FTP & API**, copia la **Password** → `BUNNY_STORAGE_API_KEY`.

2. **Región / hostname de subida**  
   - En la documentación o en el panel, el host de subida suele ser `{region}.storage.bunnycdn.com`.  
   - Ajusta `BUNNY_STORAGE_REGION` si no es Frankfurt (`de`).

3. **Pull Zone (CDN)**  
   - Crea un Pull Zone vinculado a ese Storage Zone (origen = tu storage).  
   - Copia el hostname CDN (termina en `.b-cdn.net` o tu dominio personalizado) → `BUNNY_CDN_BASE_URL` con `https://`.

4. **Caché / público**  
   - Por defecto los archivos en storage son servidos por el Pull Zone como estáticos.  
   - No hace falta abrir el Storage al público sin autenticación: la app sube con la API key **solo desde el servidor** (rutas admin protegidas).

## API (solo sesión ADMIN)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/admin/upload` | `multipart/form-data` con campo `file`. Respuesta `{ url }`. Tipos: JPEG, PNG, WebP, GIF; máx. 8 MB. |
| `POST` | `/api/admin/products/[id]/images` | JSON `{ "url": "<url del CDN>" }`. La URL debe empezar por `BUNNY_CDN_BASE_URL`. |
| `DELETE` | `/api/admin/products/[id]/images/[imageId]` | Quita la fila de galería (no borra el archivo en Bunny automáticamente). |

`POST /api/admin/products` acepta opcionalmente `imageUrl` y `extraImageUrls[]` (todas deben ser URLs bajo tu `BUNNY_CDN_BASE_URL`).

## Seguridad

- Middleware + `requireAdminApi()` aplican a `/api/admin/upload` y al resto de `/api/admin/*`.  
- No se aceptan URLs de imagen arbitrarias en create/update/galería: solo el origen configurado en `BUNNY_CDN_BASE_URL`.

## Archivos relevantes del código

- `lib/server/bunny-config.ts`, `lib/server/bunny-storage.ts`  
- `app/api/admin/upload/route.ts`  
- `app/api/admin/products/[id]/images/route.ts`, `.../[imageId]/route.ts`  
- `lib/api/admin-upload.ts`  
- `components/admin/AdminApp.tsx` (alta + edición + lista)  
- `components/store/StoreHomeClient.tsx` (tarjeta, modal, carrito)  
- `lib/products.ts`, `prisma/schema.prisma`

## Error `401 Unauthorized` al subir

Bunny indica que **401** puede ser: AccessKey inválida, **hostname regional incorrecto** o cuerpo no binario.

1. **Contraseña correcta**  
   En el panel: **Storage** → tu zona → **FTP & API** → copia la **Password** (Storage Zone password).  
   No uses la API key global de la cuenta ni claves de Stream u otros productos.

2. **Región = la de la zona**  
   En la misma pantalla verás el endpoint (ej. `ny.storage.bunnycdn.com` o `br.storage.bunnycdn.com`).  
   Pon `BUNNY_STORAGE_REGION=ny` o `br`, etc., según esa región. Si la zona está en **Brasil**, `ny` suele dar **401**.

3. **Host explícito (recomendado si dudas)**  
   Copia el hostname del panel a `BUNNY_STORAGE_API_HOST` (sin `https://`).

4. Reinicia `npm run dev` tras cambiar `.env.local`.

## Qué probar manualmente

1. Con Bunny configurado y sesión admin: subir imagen principal en **Agregar producto** → guardar → lista y tienda muestran la foto (HTTP URL).  
2. Añadir varias imágenes en galería en el mismo formulario → en la tienda, modal del producto muestra miniaturas y permite cambiar la vista.  
3. **Editar** producto: cambiar principal, añadir/quitar galería sin rediseño raro.  
4. Producto **sin** `imageUrl` (solo emoji): sigue viéndose como antes.  
5. Sin variables Bunny: intentar subir → mensaje claro (503 / error en toast).  
6. Sin cookie admin: `POST /api/admin/upload` → **401**.  
7. Intentar guardar `imageUrl` con dominio ajeno → **400** en API.

Tras cambiar el esquema Prisma: `npx prisma db push` (o migración) en `web/`.
