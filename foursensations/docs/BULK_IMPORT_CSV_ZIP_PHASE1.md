# Carga masiva CSV + ZIP — FASE 1 (diseño técnico)

Este documento cubre solo **diseño**: schema, contrato CSV, algoritmos, endpoints y UX. La implementación será FASE 2+.

---

## 1. Auditoría del modelo actual

| Modelo | Rol hoy | Implicaciones para importación |
|--------|---------|--------------------------------|
| **Product** | Producto plano: `slug`, `name`, `brand`, `category` (slug), `subcategory` (nombre), `description`, `price`, `stock`, `imageUrl`, etc. | No hay entidad “variante” ni `SKU` dedicado. Varios archivos de imagen con el mismo código → **una fila CSV = un Product** + **N × ProductImage** + **imageUrl** = primera imagen o la elegida. |
| **ProductImage** | Galería ordenada por `sortOrder`. | Varias imágenes con el mismo código → todas se asocian al **mismo** `productId`; no crear productos duplicados por cantidad de fotos. |

**Conclusión:** El modelo **soporta galería**; **no** soporta variantes (color/talla) como entidades hijas. Para FASE 3 se puede importar sin variantes reales; las “variantes detectadas” en preview serán **informativas** (columnas candidatas) hasta que exista schema de variantes.

---

## 2. Propuesta de schema Prisma

### 2.1 Cambios mínimos recomendados en `Product` (opcional pero útil)

```prisma
/// Referencia del proveedor / CSV (match con imágenes, re-importaciones).
externalRef  String?  @unique
```

- **Por qué:** El match CSV ↔ ZIP es por **código**; hoy ese valor no tiene campo propio (solo se podría meter en `name` o `slug`, malo para unicidad y SEO).
- **Unicidad:** `@unique` evita duplicar el mismo código en dos productos si se reimporta.
- Si preferís no tocar unicidad global: quitar `@unique` y validar en aplicación.

### 2.2 Variantes (`ProductVariant`)

**No obligatorio en la primera entrega de importación.**

- Las reglas indican: **no** inferir variantes solo por N imágenes.
- Si el CSV trae columnas tipo `COLOR`, `TALLA`, `SKU` distinto por variante, el modelo actual **no** puede modelarlo bien sin:

```prisma
model ProductVariant {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku         String?  // código de variante si aplica
  label       String?  // ej. "Rojo / M"
  attributes  Json?    // { color, talla, ... } flexible
  stock       Int      @default(0)
  price       Int?     // override opcional; null = usar precio del padre
  imageUrl    String?
  sortOrder   Int      @default(0)
  @@index([productId])
  @@unique([productId, sku]) // si sku existe por variante
}
```

**Recomendación FASE 1:** documentar `ProductVariant` como **fase posterior**. FASE 3 importa **solo `Product` + `ProductImage` (+ `imageUrl`)**; si hay columnas de variante, la preview puede marcar “variante detectada (no importada)” hasta exista el modelo y reglas de negocio.

### 2.3 Sesión de importación (`ImportJob` / filas)

Para no depender de memoria del servidor (serverless) y poder **confirmar** después del preview:

**Opción A — MVP (una tabla, JSON grande)**

```prisma
model BulkImportJob {
  id                    String   @id @default(cuid())
  createdAt             DateTime @default(now())
  expiresAt             DateTime
  createdByUserId       String?  // opcional, si enlazamos a User
  status                BulkImportStatus @default(PREVIEW)
  detectedCodeColumn    String   // header normalizado o índice + nombre original
  selectedCodeColumn    String   // igual que detected al inicio; admin puede cambiar
  csvDelimiter          String   @default(",")
  stats                 Json     // totales, conteos por estado
  previewRows           Json     // array de filas enriquecidas (ver contrato API)
  imageManifest         Json     // { fileName, normalizedKey, matchedRowIndex | null }
  tempZipStorageKey     String?  // ruta relativa bajo tmp o id en disco
  errorMessage          String?
}

enum BulkImportStatus {
  PREVIEW
  IMPORTING
  COMPLETED
  FAILED
  EXPIRED
}
```

- **Limpieza:** job con `expiresAt` pasado → cron o borrado al crear nuevo job del mismo usuario; borrar ZIP temporal siempre al `COMPLETED` / `FAILED` / `EXPIRED`.
- **Límite:** si `previewRows` supera ~1–2 MB, pasar a **Opción B**.

**Opción B — Escalable**

- `BulkImportJob` liviano (metadata + columnas detectadas).
- `BulkImportPreviewRow` con `jobId`, `rowIndex`, `payload Json`, `selected Boolean`, `matchKey`, `issues Json[]`.

**FASE 1 recomienda:** empezar con **Opción A** con tope de filas (ej. 500) y tamaño máximo de ZIP; documentar migración a B.

### 2.4 ¿Hace falta `ImportRow` separado?

Sí, como **tabla** (Opción B) o **embebido en JSON** (Opción A). Nombre lógico: fila de preview = `ImportRow` en el contrato API; en DB puede ser elemento del array `previewRows`.

---

## 3. Contrato del CSV

### 3.1 Normalización de headers (compartida con detección de código)

Aplicar a **cada** nombre de columna:

1. `trim()`
2. `toLowerCase()` (locale `es` opcional para ñ)
3. Quitar tildes (NFD + quitar marcas combinantes)
4. Colapsar espacios múltiples a uno
5. Reemplazar `_` por espacio; opcionalmente unificar `-` (quitar guiones **solo** si rodeados de espacios o duplicados, no alfanuméricos internos tipo `SUB- CATEGORIA` → `sub categoria`)

### 3.2 Columnas obligatorias (lógicas, no nombres fijos)

Tras mapeo por **sinónimos** (similar a la heurística del código):

| Concepto | Sinónimos de header normalizado (ejemplos) | Destino en `Product` |
|----------|---------------------------------------------|----------------------|
| Nombre / detalle | `detalle`, `nombre`, `descripcion corta`, `producto` | `name` (y/o `description`) |
| Precio | `precio`, `precio venta`, `pvp` | `price` (entero COP) |
| Stock | `stock`, `stock actual`, `inventario`, `cantidad` | `stock` |

**Categoría / subcategoría:** deben resolverse contra el **árbol existente** en DB (slugs y nombres de `Category` / `Subcategory`), como hoy el admin manual. Sinónimos:

- `categoria`, `categoría` → match slug o nombre
- `sub categoria`, `subcategoria`, `sub-categoria` → nombre de sub

**Marca:** `marca`, `brand` → `brand`.

### 3.3 Columnas opcionales

- `precio original`, `precio tachado` → `originalPrice`
- Cualquier columna no mapeada → ignorada o guardada en `preview` como “extra” para futuro.

### 3.4 Columna de código (detectable, no obligatoria por nombre)

- Lista de **patrones de nombre** (prioridad) + **score por contenido** (ver §4).
- El admin puede **sobreescribir** el header elegido antes de confirmar.

### 3.5 Formato físico

- Codificación: **UTF-8** (con BOM permitido).
- Delimitador: detectar `,` o `;` en primera línea (heurística simple).
- Primera fila = headers.

---

## 4. Algoritmo de detección de columna “código”

### 4.1 Lista de prioridad por nombre (sobre header ya normalizado)

Orden **estricto** (primera coincidencia gana bonus; luego se combina con score de contenido):

1. `codigo variante`
2. `cod variante`
3. `codigo producto` (cuidado: en tu CSV hay también `codigo de producto` → normalizado `codigo de producto`; incluir en lista **antes** de `codigo` genérico si se desea priorizar producto sobre variante en otros catálogos — **configurable**: sublista ordenada)
4. `codigo de producto`
5. `referencia`
6. `ref`
7. `sku`
8. `codigo`
9. `cod`

**Implementación sugerida:** array de regex o de strings normalizados; para cada columna del CSV calcular `nameScore` = índice en la lista (menor = mejor) o 999 si no matchea.

### 4.2 Score por contenido (por columna)

Para cada columna, sobre las filas de datos (excl. header), con muestra máx. N filas (ej. 500):

- `fillRate` = proporción de celdas no vacías (tras trim).
- `avgLen` = longitud media de string.
- `maxLen` = penalizar si muchos valores > 80 chars (probable descripción, no código).
- `numericLike` = % que matchean `^[A-Za-z0-9._-]+$` y longitud entre 1 y 64 (ajustable).
- **No** exigir longitud fija 5–6.

**Fórmula conceptual:**

```
contentScore = w1*fillRate + w2*numericLike - w3*penaltyLongText
```

Combinar:

```
finalScore = f(nameScore) + contentScore
```

Elegir columna con **mejor `finalScore`**. Empates: desempatar por **orden de prioridad de nombre** (menor índice).

### 4.3 Salida para la preview

- `detectedCodeColumn`: **nombre original del header** (para mostrar al usuario) + **índice** estable.
- `candidates`: top 3 columnas con scores (transparencia).
- `adminOverride`: el front envía `selectedCodeColumnIndex` o `selectedHeaderOriginal` en confirmación.

---

## 5. Estrategia de matching CSV ↔ imágenes

### 5.1 Del ZIP

- Listar archivos; filtrar extensiones de imagen: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` (case insensitive).
- Ignorar `__MACOSX`, `.DS_Store`, carpetas vacías.

### 5.2 Clave desde nombre de archivo

- `basename` sin extensión.
- Normalizar **igual que valores del CSV** en la columna código elegida:
  - trim, lowercase, quitar tildes, colapsar espacios.
  - Opcional: quitar ceros a la izquierda **solo si** ambos lados (CSV y archivo) son puramente numéricos — **riesgoso**; FASE 1: **sin** strip de ceros (match exacto tras normalización de string).

### 5.3 Match

- Mapa: `normalizedCode -> lista de rutas/archivos en ZIP`.
- Para cada fila CSV: `key = normalize(row[codeColumn])`.
- Si `key` está en el mapa → fila **con imagen(es)**; orden de galería = orden alfabético de nombre de archivo o orden de aparición en ZIP.
- Si `key` no está → fila **sin imagen** (warning).
- Archivos cuyo `key` no está en ninguna fila → **imágenes sin match**.

### 5.4 Sin fuzzy matching agresivo

- Solo **igualdad** de string normalizado.
- Opcional futuro: flag “sugerencia” si Levenshtein ≤ 1 **solo en preview**, nunca auto-aplicar.

### 5.5 Varias imágenes, mismo código

- Todas se asocian al **mismo** `Product` pendiente de crear.
- Primera (por regla fija) → `imageUrl`; resto → `ProductImage` con `sortOrder` incremental.
- **No** crear múltiples productos por eso.

### 5.6 Variantes

- Si existen columnas normalizadas `color`, `tono`, `talla`, `tamaño`, `presentacion`, `variant group`, `variant_group`, `sku` **adicional** al código de match, la preview puede marcar `variantHints: { ... }` sin crear `ProductVariant` hasta FASE schema.

---

## 6. Endpoints necesarios (propuesta)

Todos bajo `/api/admin/...`, **sesión ADMIN**, `multipart/form-data` o flujo en dos pasos.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/admin/import/bulk/preview` | Body: `csv` (file) + `zip` (file). Crea job temporal, parsea, detecta columna, matchea, devuelve **preview JSON** + `jobId`. Limpia ZIP al fallar validación. |
| `PATCH` | `/api/admin/import/bulk/[jobId]` | Body JSON: `{ selectedCodeColumnIndex \| selectedHeaderOriginal, selectedRowIndexes: number[] }` (solo permitir subset de filas válidas). Actualiza job en estado PREVIEW. |
| `POST` | `/api/admin/import/bulk/[jobId]/commit` | Ejecuta importación: sube imágenes a Bunny, crea `Product` + `ProductImage`, actualiza job a COMPLETED. Idempotencia: rechazar si status ≠ PREVIEW o job expirado. |
| `DELETE` | `/api/admin/import/bulk/[jobId]` | Cancela y borra temporales. |

**Límites sugeridos:** tamaño CSV ≤ 2 MB, ZIP ≤ 50 MB, máx. filas 500, máx. imágenes 2000 (ajustable).

**Temporales:** `os.tmpdir()/ginna-import-{jobId}/` o `fs.mkdtemp`; `finally` + `rmSync` recursivo; en commit borrar tras éxito.

---

## 7. Propuesta de UX (admin, sin rediseño global)

1. **Pestaña “Carga masiva”** (reemplaza el flujo actual de lista manual).
2. **Bloque 1:** input archivo **CSV** + input **ZIP** + botón **“Analizar”** (no importa aún).
3. **Bloque 2 — Preview** (misma tarjeta `admin-card`, tipografía actual):
   - Resumen: total filas, total imágenes, filas con error de mapeo, sin imagen, imágenes huérfanas.
   - **“Columna de código detectada:”** + desplegable con top 3 candidatos + opción “otra columna” listando todos los headers.
   - Tabla compacta: checkbox por fila (default: solo filas **válidas** y con precio/stock OK), columnas clave, estado (✓ imagen / ⚠ sin imagen / ✗ error), mini-thumb si hubiera data URL en preview **opcional** — para no cargar binarios en JSON, mejor mostrar **nombre de archivo** asociado; thumbs tras commit o URLs temporales solo si se implementa servicio de thumb (FASE 2).
4. **Botón “Importar seleccionados”** → llama `commit` → progreso/toast como hoy.
5. **Errores** por fila visibles en tooltip o fila expandida (mensaje corto).

**No:** importación automática al subir archivos.  
**No:** matching en el cliente.

---

## 8. Resumen de decisiones FASE 1

| Tema | Decisión |
|------|----------|
| Variantes | No en schema inicial de import; opcional `ProductVariant` documentado para después. |
| Múltiples imágenes / código | Un `Product`, galería `ProductImage` + `imageUrl`. |
| Columna código | Heurística nombre + contenido; override manual en UI. |
| Match | Normalización + igualdad estricta. |
| Estado preview | `BulkImportJob` + JSON o tablas normalizadas si crece. |
| Seguridad | Mismas reglas que `/api/admin/*`; archivos solo en tmp con TTL. |

---

*Siguiente paso (FASE 2): implementar `POST .../preview` + tipos TypeScript compartidos + tests unitarios de normalización y detección de columna.*
