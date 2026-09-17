# CRUD de productos (admin) — API + UI

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `app/api/admin/products/route.ts` | `GET` lista, `POST` crear |
| `app/api/admin/products/[id]/route.ts` | `GET` uno, `PUT` actualizar, `DELETE` eliminar |
| `lib/validation/admin-product.ts` | Esquemas Zod create/update + `formatZodError` |
| `lib/mappers/admin-product.ts` | `prismaProductToAdmin` (fila Prisma → JSON admin) |
| `lib/server/product-slug.ts` | `allocateUniqueProductSlug` |
| `lib/slugify.ts` | Generación de slug (compartido con seed) |
| `lib/api/admin-products.ts` | Cliente `fetch` para el panel (browser) |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `components/admin/AdminApp.tsx` | Carga productos desde API; alta/edición/borrado/carga masiva/stock con `PUT`; estados de carga y error |
| `lib/types/admin.ts` | `AdminProduct.id` → `string` (cuid); `slug`, `isNew`, `imageUrl`; `AdminSale.productId` → `string \| null` |
| `data/admin-initial.ts` | Eliminado `getDefaultAdminProducts` (fuente = DB) |
| `package.json` | Dependencia `zod` |
| `prisma/seed.ts` | Usa `slugify` de `lib/slugify.ts` |

## Endpoints

| Método | Ruta | Cuerpo / respuesta |
|--------|------|---------------------|
| `GET` | `/api/admin/products` | Respuesta: `{ products: AdminProduct[] }` (todos, orden `updatedAt` desc) |
| `POST` | `/api/admin/products` | JSON validado con `adminProductCreateSchema` → `201 { product }` |
| `GET` | `/api/admin/products/[id]` | `200 { product }` o `404` |
| `PUT` | `/api/admin/products/[id]` | JSON parcial `adminProductUpdateSchema` → `200 { product }` |
| `DELETE` | `/api/admin/products/[id]` | `204` sin cuerpo o `404` |
| `POST` | `/api/admin/upload` | `multipart/form-data` campo `file` → `{ url }` (Bunny; sesión admin). Ver [Bunny / imágenes](./BUNNY_IMAGES.md). |
| `POST` | `/api/admin/products/[id]/images` | JSON `{ url }` — añade fila en galería. |
| `DELETE` | `/api/admin/products/[id]/images/[imageId]` | Quita imagen de galería. |

El cuerpo de **crear** producto puede incluir `imageUrl` y `extraImageUrls` (URLs bajo tu CDN). Errores habituales: `400` + `{ error, details? }`, `409` slug duplicado (create/update).

**Nota:** Las rutas `/api/admin/products` exigen sesión **ADMIN**; ver [Autenticación admin](./ADMIN_AUTH.md).

## Categorías en el formulario de producto

Los selects de **categoría** y **subcategoría** se cargan desde **`GET /api/admin/categories`** (DB). Ver [CRUD de categorías](./ADMIN_CATEGORIES_CRUD.md): el producto guarda `category` = **slug** de categoría y `subcategory` = **nombre** de la subcategoría.

## Qué probar manualmente

1. Iniciar sesión en `/admin` y abrir **Gestión de productos → Lista**: deben aparecer los productos de la DB (mismos que en Prisma Studio).
2. **Agregar producto**: completar formulario (incl. descripción y subcategoría elegida desde la DB) → guardar → debe aparecer en lista tras refresco.
3. **Editar** (lápiz): cambiar nombre/precio/stock → guardar → verificar en Studio o recargando lista.
4. **Eliminar** (papelera) → confirmar → fila desaparece y registro borrado en DB.
5. **Carga masiva**: varios ítems → guardar todos → comprobar N inserts en DB.
6. **Inventario** (pestaña Stock): `+` / `−` / editar número y **blur** → stock persistido (vía `PUT`).
7. Probar error de validación (ej. precio 0 o nombre vacío en alta) → toast / respuesta API.

## Carga inicial de la lista (admin)

- El **GET** `/api/admin/products` usa `dynamic = "force-dynamic"` y cabeceras **`Cache-Control: no-store`** para que Next/CDN no sirvan una lista vacía cacheada en build.
- El cliente usa `credentials: "include"` y valida que `products` sea un **array** en el JSON.
- `AdminApp` vuelve a pedir la lista al entrar con sesión lista y otra vez al cambiar a la página **Productos**.

## Pendiente (fuera de alcance actual)

- Bunny / `imageUrl` en formularios admin
- Ventas e inventario avanzado persistidos
- Menú del sitio desde `SiteMenu`
