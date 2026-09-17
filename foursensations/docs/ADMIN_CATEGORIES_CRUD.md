# CRUD de categorías y subcategorías (admin) — API + UI

Relacionado: [CRUD de productos](./ADMIN_PRODUCTS_CRUD.md). Los productos guardan **`category`** = **slug** de categoría y **`subcategory`** = **nombre visible** de la subcategoría (como en el seed).

## Archivos principales

| Archivo | Descripción |
|---------|-------------|
| `app/api/admin/categories/route.ts` | `GET` árbol ordenado, `POST` crear categoría |
| `app/api/admin/categories/[id]/route.ts` | `GET`, `PUT`, `DELETE` categoría |
| `app/api/admin/categories/[id]/subcategories/route.ts` | `POST` subcategoría |
| `app/api/admin/subcategories/[id]/route.ts` | `PUT`, `DELETE` subcategoría |
| `lib/validation/admin-category.ts` | Zod create/update categoría y subcategoría |
| `lib/server/category-slugs.ts` | Slugs únicos (categoría global; sub por `categoryId`) |
| `lib/server/no-store-json.ts` | Respuestas JSON con `Cache-Control: no-store` |
| `lib/api/admin-categories.ts` | Cliente `fetch` (browser) |
| `lib/types/admin-category.ts` | Tipos `AdminCategoryTree`, etc. |
| `components/admin/AdminApp.tsx` | Pestaña **Categorías**; selects de producto/carga masiva/stock desde API |

## Endpoints

| Método | Ruta | Notas |
|--------|------|--------|
| `GET` | `/api/admin/categories` | `{ categories: AdminCategoryTree[] }` |
| `POST` | `/api/admin/categories` | Crear categoría (`name`, `slug?`, `icon?`, `sortOrder?`) |
| `GET` | `/api/admin/categories/[id]` | Una categoría con subcategorías |
| `PUT` | `/api/admin/categories/[id]` | Si cambia el **slug**, se actualiza `product.category` de los afectados |
| `DELETE` | `/api/admin/categories/[id]` | `409` si hay productos con ese `category` (slug) |
| `POST` | `/api/admin/categories/[id]/subcategories` | Crear sub (`name`, `slug?`, `sortOrder?`) |
| `PUT` | `/api/admin/subcategories/[id]` | Si cambia el **nombre**, se actualiza `product.subcategory` donde coincida categoría+nombre viejo |
| `DELETE` | `/api/admin/subcategories/[id]` | `409` si hay productos con esa categoría + ese nombre de sub |

Errores habituales: `400` validación, `404`, `409` conflicto (slug duplicado o delete bloqueado).

**Nota:** Estas rutas están protegidas como el resto de `/api/admin/*`; ver [Autenticación admin](./ADMIN_AUTH.md).

## Qué probar manualmente

### Categorías

1. **Lista / árbol**: Con sesión en `/admin`, abrir **Categorías y subcategorías** → deben coincidir con Prisma (`Category` + `Subcategory`).
2. **Alta categoría**: Nombre (y opcional slug/icono/orden) → guardar → aparece en lista y en **GET** API.
3. **Editar categoría**: Cambiar nombre/icono/orden → guardar → persistido.
4. **Cambiar slug de categoría**: Tras guardar, en Studio verificar que los productos que usaban el slug anterior tengan el **nuevo** `category`.
5. **Eliminar categoría sin productos** → `204` y desaparece de la UI.
6. **Eliminar categoría con productos** → debe mostrar error **`409`** (no borrar en DB).

### Subcategorías

7. **Alta sub** bajo una categoría → aparece en la tabla de esa categoría.
8. **Editar sub** (nombre/slug/orden) → persistido.
9. **Renombrar sub**: Productos que tenían el nombre viejo (misma categoría por slug) deben tener el **nuevo** `subcategory` en DB.
10. **Eliminar sub sin productos** → desaparece.
11. **Eliminar sub con productos** asignados → **`409`**.

### Productos (integración con DB)

12. **Agregar producto**: Los desplegables de categoría/subcategoría deben reflejar lo guardado en DB (no listas mock).
13. **Editar producto**: Mismos selects; al cambiar categoría, el select de sub debe mostrar solo subs de esa categoría.
14. **Carga masiva**: La categoría por defecto (slug) y la primera sub por categoría deben alinearse con datos reales; tras crear categorías nuevas, recargar admin y verificar que el CSV/plantilla use slugs/nombres válidos.
15. **Inventario / lista**: Columna o etiqueta de categoría (si aplica) coherente con el árbol cargado desde API.

### Caché / refresco

16. Tras operaciones en otra pestaña o en Studio, **volver a Categorías** o recargar: la lista debe actualizarse (rutas dinámicas + cliente con `no-store`).

## Fuente de verdad

- **Categorías y subcategorías**: PostgreSQL vía Prisma; el admin ya no usa `SUBCATS` ni mocks como fuente principal para formularios de producto.
