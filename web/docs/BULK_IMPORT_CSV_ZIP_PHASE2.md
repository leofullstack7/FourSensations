# Carga masiva CSV + ZIP — FASE 2 (implementado)

## Reglas de almacenamiento (cumplimiento)

| Regla | Implementación |
|--------|----------------|
| **Imágenes finales en Bunny + URL en DB** | En `commit`, cada imagen seleccionada se sube con `uploadImageToBunny`; `Product.imageUrl` y `ProductImage.url` guardan la URL del CDN. |
| **CSV/ZIP no son assets públicos** | No hay rutas estáticas ni APIs públicas que sirvan CSV/ZIP. Solo rutas bajo `/api/admin/import/bulk/*` (middleware + `requireAdminApi`). |
| **Temporales durante el job** | El CSV se parsea en memoria; en DB solo se guardan `headers` y `rows` como JSON **mientras el job está en preview**. El ZIP va a `BulkImportJob.zipBlob` en Postgres hasta el fin del job. La descompresión es **en memoria** (`adm-zip`), sin carpeta temporal en disco. |
| **Solo imágenes de filas seleccionadas → Bunny** | `commit` solo sube los bytes de las entradas del ZIP que corresponden a `rowIndexes` elegidos. |
| **Tras importación (éxito o fallo grave)** | Se vacía `zipBlob`, se purgan `headers` y `rows`, y `previewPayload` queda reducido a un **resumen** (`commitSummary` o mensaje de fallo), no al preview completo. |
| **Frontend no recibe CSV/ZIP** | Las respuestas son JSON (`preview`, `jobId`, etc.); nunca se devuelve el binario del ZIP ni el CSV crudo al cliente. |

## Requisitos de base de datos

Tras actualizar `schema.prisma` (incl. `BulkImportJob`, `Product.externalRef`, `BulkImportStatus`):

```bash
cd web
npm run db:push
# o
npx prisma db push
```

Sin esto, Prisma fallará al leer `Product.externalRef` o al crear jobs.

## Dependencias

- `adm-zip` + `@types/adm-zip` — lectura del ZIP en el servidor.

## API (admin, cookies de sesión)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/admin/import/bulk/preview` | `multipart/form-data`: `csv`, `zip`, `defaultCategorySlug` (opcional). Crea `BulkImportJob` y devuelve `jobId` + `preview`. |
| `PATCH` | `/api/admin/import/bulk/[jobId]` | JSON: `codeColumnIndex`, `defaultCategorySlug`, `selection[]` (opcionales). Recalcula preview. |
| `DELETE` | `/api/admin/import/bulk/[jobId]` | Cancela y borra el job. |
| `POST` | `/api/admin/import/bulk/[jobId]/commit` | JSON: `{ rowIndexes: number[] }`. Sube imágenes a Bunny, crea `Product` + `ProductImage`, `externalRef` = código normalizado. |

## Front

Pestaña **Carga masiva** en `AdminApp`: subida CSV+ZIP, badge “Fase 2”, resumen numérico, selector de columna de código, tabla con checkboxes, importación de seleccionados.

## Productos

- `POST /api/admin/products` acepta `externalRef` opcional (único).
- El listado admin incluye `externalRef` en el JSON si existe.
