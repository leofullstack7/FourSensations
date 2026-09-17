# Guía maestra — Adaptar el proyecto "GinnaBeauty" a Four Sensations

**Para usar en Cursor.** Este documento es el punto de partida: contiene toda la información de marca de Four Sensations (extraída de los PDFs oficiales) más el mapa completo del proyecto plantilla que ya tienes en `C:\Users\leang\OneDrive\Documents\FourSensations`, para que Cursor (o cualquier desarrollador) pueda ejecutar la migración de branding sin tener que ir a buscar cada dato por separado.

> Última actualización: 2026-09-01. Preparado por Claude a partir de: `INFORMACIÓN.pdf`, `PREGUNTAS FRECUENTES.pdf`, `POLÍTICA DE ENVÍOS, CAMBIOS, DEVOLUCIONES, GARANTÍAS, RETRACTO Y REVERSIÓN DEL PAGO.pdf`, `POLÍTICA DE TRATAMIENTO Y PROTECCIÓN DE DATOS PERSONALES.pdf`, `CATÁLOGO DE PRODUCTOS.pdf` y la exploración del repo `FourSensations/web`.

---

## 0. Cómo usar este documento con Cursor

1. Copia este archivo a la raíz del repo (`FourSensations/GUIA_FOURSENSATIONS_CURSOR.md`) — ya te lo dejo ahí.
2. Ábrelo en Cursor y dile algo como: *"Lee GUIA_FOURSENSATIONS_CURSOR.md completo. Vamos a ejecutar la Fase 1 (rebranding textual). No toques lógica de negocio, solo textos, nombres, colores y metadatos."*
3. Trabaja **por fases** (sección 8). No le pidas todo de una vez: el proyecto es grande (Next.js 14 + Prisma + Auth + pagos), y mezclar rebranding con cambios funcionales es la forma más fácil de romper algo.
4. Cada vez que Cursor tenga dudas de contenido (texto legal, copy, precios), la fuente de verdad es este documento y los PDFs originales — no debe inventar datos de la marca.

---

## 1. Qué es este proyecto y qué vamos a hacer

Tu carpeta `FourSensations/` en OneDrive **no es una plantilla genérica**: es el repositorio real de una tienda online ya construida (actualmente con marca **"GinnaBeauty"**), en **Next.js 14 + PostgreSQL + Prisma**, con panel de administración, pagos (ePayco/Bold), carga masiva de productos, CDN de imágenes y hasta un asesor de belleza con IA. El repo Git apunta a `https://github.com/leofullstack7/ginnabeauty.git`.

El objetivo **no es construir una web nueva desde cero**: es **re-marcar (rebrand)** esta plantilla funcional para que se convierta en la tienda oficial de **Four Sensations**, reemplazando:

- Nombre de marca, logo, favicon y metadatos SEO.
- Paleta de colores y tipografías (si el manual de marca define otras).
- Textos institucionales (quiénes somos, misión, visión).
- Categorías y catálogo de productos.
- Políticas legales (envíos, cambios, datos personales, términos) — **estas ya no pueden quedarse con el contenido de ejemplo**, deben decir la verdad legal de Four Sensations S.A.S.
- Datos de contacto, WhatsApp, redes y horarios.
- Variables de entorno / cuentas de servicio (dominio, pasarela de pago, email, CDN de imágenes) — estas las debes crear tú a nombre de Four Sensations, yo no tengo acceso a esas cuentas.

Dato importante y muy a favor: el **menú de categorías que ya tiene programado el sitio** (`Accesorios`, `Cuidado capilar`, `Cuidado piel`, `Maquillaje`, `Hombres`, `Uñas`, `Mayorista`) **coincide casi exactamente** con la estructura de negocio de Four Sensations (marca de cuidado capilar con línea de accesorios y programa de mayoristas). Esto significa que la reestructuración de navegación es mínima; el trabajo grueso es de contenido y catálogo.

---

## 2. Snapshot técnico del proyecto (repo `FourSensations/`)

```
FourSensations/                     ← raíz del repo Git (rama main)
├── DESPLIEGUE_Y_ESTRUCTURA.md      ← guía técnica completa (léela, sigue siendo válida)
├── MIGRATION.md                    ← auditoría de la migración HTML → Next.js
├── index.html / admin.html / main.js / style.css   ← versión legacy, ya no es la que se despliega
├── igora/                          ← assets locales de tintes (no está en Git)
├── productos/imagenes/banners/     ← banners ya generados (accesorios, cuidado capilar,
│                                       cuidado piel, hombres, maquillaje, uñas) — genéricos,
│                                       de stock/IA, sin logo ni colores de marca todavía
└── web/                            ← **la aplicación real, trabajar aquí**
    ├── app/                        ← rutas (App Router de Next.js)
    │   ├── (store)/                ← tienda pública
    │   ├── admin/                  ← panel admin
    │   └── api/                    ← endpoints REST
    ├── components/store/  components/admin/  components/brand/
    ├── lib/                        ← lógica de negocio, Prisma, integraciones
    ├── prisma/schema.prisma        ← modelo de datos (Product, Category, Order, User...)
    ├── data/mock-products.ts       ← catálogo de ejemplo (fallback sin base de datos)
    ├── public/  assets/            ← imágenes, logos, banners
    ├── docs/                       ← documentación por módulo (auth, CDN, pagos, bulk import)
    └── .env.example                ← plantilla de variables de entorno
```

**Stack:** Next.js 14 (App Router) + React 18 + TypeScript · PostgreSQL vía Neon + Prisma 6 · Auth.js (NextAuth v5) + bcrypt para el admin · Google OAuth + email/password para clientes · **Bunny CDN** para imágenes de producto · **ePayco** y **Bold** como pasarelas de pago colombianas · **Resend** para emails transaccionales · Hosting en **Render**, despliegue vía `git push` a `main`.

**Documentación que ya existe y debes conservar/actualizar (no reescribir desde cero):**
- `DESPLIEGUE_Y_ESTRUCTURA.md` — cómo clonar, configurar y desplegar en otro equipo.
- `web/docs/ADMIN_AUTH.md`, `ADMIN_PRODUCTS_CRUD.md`, `ADMIN_CATEGORIES_CRUD.md`, `BULK_IMPORT_CSV_ZIP_PHASE1.md` / `PHASE2.md`, `BUNNY_IMAGES.md`, `EPAYCO_SANDBOX_VALIDATION.md`, `GOOGLE_OAUTH.md`.

---

## 3. Sobre la marca Four Sensations (fuente: PDFs del proyecto)

### Quiénes somos
Four Sensations es una marca **colombiana de cuidado capilar y bienestar**, nacida en **Manizales en 2014**. Combina innovación cosmética, fórmulas de alto desempeño e identidad visual propia. Se define como "mucho más que una marca de productos": es una comunidad y una experiencia — **"El Club de los Cabellos Perfectos"**.

Universo de marca: **femenino, colorido, cercano y aspiracional**, pero con foco real en desarrollo, calidad y resultados (no solo empaque bonito).

### Misión
Crear productos de cuidado capilar y belleza que combinen calidad, innovación, desempeño y una experiencia memorable, ayudando a cada persona a construir rutinas que respondan a las necesidades reales de su cabello.

### Visión
Consolidarse como marca colombiana referente en cuidado capilar, reconocida por la calidad de sus fórmulas y su capacidad de innovación, creciendo en hogares, ciudades y canales de venta, compitiendo con grandes referentes de la industria cosmética.

### Manifiesto (útil como copy de "quiénes somos" / hero de la home)
> No creemos en productos bonitos por fuera y vacíos por dentro. No creemos en rutinas complicadas solo porque estén de moda. No creemos que la ciencia tenga que sentirse fría. Creemos en fórmulas que tengan propósito. En productos que quieras volver a comprar. En empaques que te hagan sonreír. En experiencias que recuerdes. Creemos en cuidar el cabello con intención, disfrutar el proceso y convertir cada rutina en algo especial. Bienvenida al Club de los Cabellos Perfectos.

### Público objetivo
Principalmente mujeres que disfrutan cuidarse, sin una edad específica definida. Cabello de todo tipo: seco, graso, mixto, con frizz, opaco, debilitado o maltratado por procesos químicos.

### Diferenciadores (para secciones tipo "por qué elegirnos")
- **Fórmulas con intención** — cada producto cumple una función dentro de la rutina.
- **Calidad antes que ruido** — inversión en desarrollo y experiencia real.
- **Identidad propia** — colores, ilustraciones, empaques y comunicación reconocibles.
- **Asesoría cercana** — no venden por vender, orientan según la necesidad del cabello.
- **Experiencias memorables** — cada punto de contacto (producto, stand, tienda, pedido) debe "sentirse Four Sensations".

### Datos legales y de contacto (usar tal cual, son datos oficiales)

| Campo | Valor |
|---|---|
| Razón social | FOUR SENSATIONS S.A.S. |
| NIT | 901.038.691-2 |
| Ciudad / sede | Manizales, Caldas, Colombia |
| Dirección | Calle 65A #23A-15 |
| Correo de atención al cliente | atencionalcliente.befs@gmail.com |
| WhatsApp / teléfono | +57 304 363 2492 |
| Horario de atención | 9:00 a. m. a 6:00 p. m. |
| Cobertura de envíos | Todo Colombia |
| Transportadoras | Envía (principal), Interrapidísimo (municipios/zonas con reexpedición) |
| Tiempo de despacho comprometido | Máx. 2 días hábiles desde confirmación del pedido |

**No tengo** (no aparece en los PDFs del proyecto): usuarios de Instagram/TikTok/Facebook, dominio final del sitio, ni el logo/colores exactos del manual de marca (ver sección 4 y 10 — necesito que me los compartas o que Cursor los extraiga directamente del PDF `Manual_de_Marca_Four_Sensations_2026.pdf`, que es un documento prácticamente todo en imágenes y no pude leer su texto).

---

## 4. Identidad visual — Manual de Marca oficial (Four Sensations, versión 2026)

Ya revisé el `Manual_de_Marca_Four_Sensations_2026.pdf` completo (me compartiste las páginas como imágenes). Esto reemplaza cualquier suposición anterior: **esta es la fuente de verdad oficial de la marca.**

### 4.1 ADN de marca (página 02 del manual)

- **Qué es Four Sensations:** marca colombiana de cuidado capilar y bienestar femenino, con identidad visual memorable, cercana y aspiracional.
- **Esencia:** Ciencia + feminidad + experiencia sensorial.
- **Concepto central:** *"El club de los cabellos perfectos"* (coincide exactamente con el manifiesto de `INFORMACIÓN.pdf` — úsalo como tagline/eslogan recurrente).
- **Personalidad de marca:** femenina, girly, experta, innovadora, aspiracional, cercana.
- **Promesa:** resultados reales, fórmulas de alto desempeño y una experiencia de marca inolvidable.
- **Valores:** calidad, innovación, confianza, creatividad, cuidado, coherencia visual.
- **Tono general:** dulce, segura, moderna, detallista, encantadora.
- **Claim de campaña:** *"Belleza que se siente."* / *"Belleza con intención, ciencia con encanto."*

### 4.2 Sistema de logo (páginas 03-04)

- **Logo principal:** lettering manuscrito ("four" + "sensations" en dos líneas, cursiva orgánica) con un **corazón-diamante** (isotipo geométrico, facetado, con un pequeño diamante en el centro) integrado como punto sobre la "o" de "four".
- **Isotipo:** el corazón-diamante solo, usable de forma independiente (ideal como favicon, icono de app, watermark).
- **Versiones permitidas:** (1) principal a color pastel (morado sobre blanco), (2) monocromática lila, (3) blanco sobre fondo lila (para fondos oscuros/de color), (4) negro — **solo en usos excepcionales** (impresión de un solo color, por ejemplo).
- **Construcción visual:** combina lettering orgánico con un símbolo geométrico — feminidad, brillo y singularidad.
- **Área de seguridad:** margen mínimo alrededor del logo equivalente a la altura del isotipo (el corazón).
- **Tamaño mínimo:** 120 px de ancho en digital · 30 mm de ancho en impresión.
- **Fondos recomendados:** blanco, lila muy suave, rosa pastel, o fotografía limpia con buen contraste.
- **Usos incorrectos (nunca hacer):** deformar, rotar, cambiar los colores sin criterio, agregarle sombras intensas, ponerlo sobre fondos muy saturados, o modificar la tipografía del lettering.

**Assets extraídos:** te dejo 3 recortes en alta calidad tomados directo del manual (sirven como referencia inmediata para Cursor, aunque son un recorte de página, no el archivo vectorial original):
- `logo-principal-foursensations.png` — logo completo a color.
- `isotipo-corazon-foursensations.png` — solo el corazón-diamante (para favicon/app icon/watermark).
- `logo-blanco-sobre-lila.png` — versión blanca para fondos de color.

⚠️ Para producción real (impresión, packaging, casos donde se necesite escalar sin pérdida de calidad) sigue siendo importante que consigas el **archivo vectorial original** (SVG/AI/EPS) del diseñador de la marca — estos PNG recortados son suficientes para maquetar la web, pero no son la fuente vectorial.

### 4.3 Paleta cromática oficial (página 05)

```css
--morado-pastel:  #C9A6E8;  /* Primario — identidad principal */
--rosado-pastel:  #F6B7D7;  /* Primario — identidad principal */
--amarillo-pastel:#F8E7A6;  /* Apoyo / acento */
--verde-menta:    #BFE8D7;  /* Apoyo / acento */
--blanco:         #FFFFFF;  /* Neutral — fondos */
--lavanda-suave:  #F5F1F8;  /* Neutral — fondos, respiración visual */
```

**Uso recomendado (tal cual lo define el manual):** morado y rosa para identidad principal; amarillo y menta como acentos; blanco y lavanda para fondos y "respiración visual". Sensación visual buscada: **dulce, limpia, luminosa, femenina**.

### 4.4 Tipografía (página 06)

1. **Lettering de la diseñadora** — la fuente manuscrita del logo. Uso: **solo** logo, firmas de marca y piezas especiales. No es una fuente de sistema de texto corrido.
2. **"212 Baby Girl"** — tipografía script/cursiva. Uso: títulos creativos, destacados y frases de campaña (ej. hero de la home, banners).
3. **Tipografía de apoyo sans serif limpia** — uso: cuerpo de texto, fichas de producto, presentaciones, piezas funcionales. El manual **no especifica el nombre exacto** de esta sans serif — solo la describe como "limpia". Necesitas definirla (ver preguntas pendientes, sección 10) o elegir una Google Font afín al tono (ej. Poppins, Quicksand, Nunito, Baloo 2 — todas legibles y con carácter suave/redondeado, coherentes con "dulce, cercana, femenina").
4. **Jerarquía recomendada:** Título → Subtítulo → Cuerpo → Destacado → CTA.

Principio guía: **priorizar legibilidad sin perder el carácter dulce y memorable de la marca.**

### 4.5 Universo visual / estilo fotográfico (página 07)

- **Elementos gráficos:** corazón diamante, sparkles (destellos), curvas suaves, flores delicadas, formas redondeadas, bloques limpios.
- **Estilo fotográfico:** fondos pastel, luz luminosa, producto como protagonista, encuadres femeninos, sensación limpia, dulce y aspiracional.
- **Composición:** espacios amplios, equilibrio entre ternura y sofisticación, información ordenada, foco claro.
- Principio guía: **la marca debe sentirse memorable, encantadora y visualmente coherente.**

### 4.6 Tono de voz (página 08) — úsalo para todo el copy del sitio

- **Así suena Four Sensations:** cercana, femenina, segura, experta, aspiracional, moderna.
- **Sí decir (ejemplos reales del manual):** "Descúbrelo", "Llévalo a tu rutina", "El club de los cabellos perfectos", "Resultados reales", "Tu nueva obsesión capilar".
- **Evitar:** promesas irreales, tono agresivo, tecnicismos fríos sin explicación, mensajes genéricos, comunicación incoherente.
- **Fórmula de copy:** Beneficio + emoción + invitación.

Esto **debe reescribir por completo** el "personaje"/tono del asesor de IA (`lib/ai-advisor-persona.ts`) y todo el copy de marketing del sitio — no solo el nombre de la marca.

### 4.7 Mapeo sugerido: tokens CSS actuales (GinnaBeauty) → paleta oficial Four Sensations

La plantilla actual usa 13 tokens de color en `web/app/design-system.css`; el manual de marca define 6. Te dejo una propuesta de mapeo — revísala tú o coméntamela, porque para los tonos que el manual no define explícitamente (variantes oscuras para hover/texto, dorado decorativo) tuve que proponer un valor razonable en vez de inventarlo como si fuera oficial:

| Token actual (GinnaBeauty) | Valor actual | Propuesta Four Sensations | Fuente |
|---|---|---|---|
| `--ivory` (fondo base) | `#FDF8F3` | `#FFFFFF` (Blanco) o `#F5F1F8` (Lavanda Suave) | Oficial |
| `--cream` | `#F5EDE3` | `#F5F1F8` (Lavanda Suave) | Oficial |
| `--blush` | `#E8C8C2` | `#F6B7D7` (Rosado Pastel) | Oficial |
| `--rose` (color primario) | `#C9918B` | `#C9A6E8` (Morado Pastel) **o** `#F6B7D7` (Rosado Pastel) — el manual da los dos como "primario" | Oficial |
| `--dusty-rose` (hover/acento oscuro) | `#B87070` | *No definido en el manual.* Propongo derivar un morado/rosa más saturado para estados hover (ej. `#B583D6` sobre morado, o `#EF8FC0` sobre rosa) | Derivado — confirmar |
| `--sage` / `--sage-light` / `--sage-dark` | `#A8BFBB` / `#C8DAD7` / `#6E9690` | Familia **Verde Menta** `#BFE8D7` (+ variantes más claras/oscuras derivadas) | Oficial (base) |
| `--lavender` / `--lavender-light` | `#C5BBDA` / `#E2DCF0` | `#C9A6E8` (Morado Pastel) / `#F5F1F8` (Lavanda Suave) | Oficial |
| `--peach` | `#EDCBB5` | `#F8E7A6` (Amarillo Pastel) | Oficial (más cercano) |
| `--gold` / `--gold-light` | `#C4A882` / `#E2D4BE` | *No está en la paleta de 6 colores*, pero en las páginas del manual los divisores decorativos (líneas bajo los títulos, "♥") sí usan un dorado suave. Mantener un dorado apagado como acento decorativo (no de marca principal) hasta confirmar el HEX exacto | Visible en el manual, HEX no confirmado |
| `--dark` / `--dark-mid` (texto de títulos) | `#2D1F1A` / `#5C3D35` | Los títulos del manual (ej. "Paleta Cromática", "ADN de Marca") usan un **morado más saturado/oscuro** que el `#C9A6E8` pastel — no viene como HEX explícito. Propongo derivarlo oscureciendo `#C9A6E8` (~15-20%) o usar un morado tipo `#8A5FB0` como aproximación, a confirmar | Derivado — confirmar |
| `--text` / `--text-light` / `--text-muted` | tonos marrón | El cuerpo de texto en el manual se ve gris oscuro neutro (no marrón). Propongo un gris oscuro estándar (`#3A3A3A` / `#6B6B6B` / `#9B9B9B`) en vez de mantener la familia marrón actual | Derivado — confirmar |

**Recomendación:** implementa primero los 6 colores oficiales tal cual (son innegociables), y para los derivados (hover, texto, dorado decorativo) genera una escala de tintes/sombras de esos 6 colores en vez de inventar colores nuevos sin relación — así todo se siente parte de la misma paleta aunque el manual no haya cubierto cada caso de uso.

### Dónde se aplican estos tokens (para que Cursor sepa qué tocar)
- `web/app/design-system.css` — tokens `:root`, tipografías, componentes base.
- `web/app/store-page-overrides.css`, `web/app/store-experience.css`, `web/app/store-experience-v2.css` — overrides visuales de la tienda.
- `web/app/admin-overrides.css`, `web/app/admin-experience.css` — panel admin (puede quedarse neutro, es solo para el equipo interno, pero conviene que use el mismo logo).
- `web/components/store/tints/tints.css`, `web/app/wholesale-landing.css` — módulos específicos (tintes, landing mayoristas).
- Logos actuales a reemplazar: `web/app/logo.png`, `web/assets/logo.png`, `web/assets/logo-largo.png`, `web/assets/logo-cuadrado.png`, `web/app/icon.png`, `web/app/apple-icon.png`, `web/public/favicon.png`, `web/public/apple-icon.png`.
- Componente que renderiza el logo en la UI: `web/components/brand/BrandLogo.tsx`.

---

## 5. Categorías: menú actual vs. catálogo real de Four Sensations

El menú ya programado en `web/lib/menu-config.ts` (`defaultMenuConfig`) tiene 7 categorías: **Accesorios, Mayorista, Cuidado capilar, Cuidado piel, Maquillaje, Hombres, Uñas**, cada una con subcategorías predefinidas.

**Importante:** al revisar `CATÁLOGO DE PRODUCTOS.pdf`, la inmensa mayoría de los productos reales de Four Sensations que aparecen son **capilares** (shampoos, acondicionadores, tratamientos, tónicos, aceites, fragancias capilares) más algunos **accesorios** (diademas, gorros, cepillos) y **un** exfoliante corporal. No encontré productos de maquillaje, cuidado facial, línea de hombres ni uñas en el catálogo que me compartiste.

Esto no significa que esas categorías estén mal — puede que Four Sensations sí las tenga y simplemente no vinieran en este PDF — pero **antes de poblar todo el menú, confírmame o dime tú a Cursor**:
- ¿Four Sensations vende actualmente maquillaje, línea de hombres y uñas, o el catálogo real hoy es 100% capilar + accesorios?
- Si el catálogo real es más angosto, lo recomendable es **lanzar solo con las categorías que sí tienen producto** (Cuidado capilar, Accesorios, Mayorista) y dejar las demás ocultas/deshabilitadas en el menú hasta que haya inventario, en vez de mostrar categorías vacías.

Subcategorías sugeridas para **Cuidado capilar** según lo que sí aparece en el catálogo: Tratamientos (Proteína 10 en 1, Dulce Renacer, Sensación Primaveral, Shots x3), Shampoos/Rutinas (Botanical, Scalp Therapy, Tentación Nutrición, Tentación Equilibrio), Finalizadores (Shine Gloss, Fantasía Natural), Tónicos (Secreto de Primavera), Fragancias capilares (Bloom Shine, Sweet Love, Scarlette, Golden Glow), Multiuso (Suspiros, Luna Llena).

---

## 6. Catálogo de productos — cómo migrarlo (no lo escribas a mano)

Buena noticia: la plantilla **ya tiene un flujo de carga masiva** pensado exactamente para esto — no hay que picar cada producto uno por uno en código.

- Modelo de datos: `web/prisma/schema.prisma` → modelo `Product` (con `category`, `subcategory`, `imageUrl`, `featuredInHome`, precio, etc.) y `ProductImage` para galería.
- Catálogo de ejemplo/fallback: `web/data/mock-products.ts` (12 productos ficticios de "GinnaBeauty" — hoy solo sirve si no hay base de datos conectada; **no es la fuente real**, es solo un placeholder para que la home no se vea vacía en desarrollo).
- Herramienta real de carga: **Admin → carga masiva CSV + ZIP de imágenes** (documentada en `web/docs/BULK_IMPORT_CSV_ZIP_PHASE1.md` y `PHASE2.md`).

**Plan recomendado:**
1. Convierte `CATÁLOGO DE PRODUCTOS.pdf` en una hoja de cálculo (nombre, categoría, subcategoría, descripción corta, modo de uso, contenido/mL, precio público, precio mayorista) — puedo ayudarte a generar ese Excel/CSV a partir del PDF si me lo pides.
2. Reúne las fotos reales de cada producto (o al menos las que ya tienes en `productos/`).
3. Usa el flujo de **carga masiva CSV + ZIP** del panel admin para poblar la base de datos real, en vez de tocar `mock-products.ts` a mano.
4. Deja `data/mock-products.ts` como lo que es (fallback de desarrollo) o reemplázalo por 4-6 productos reales de Four Sensations para que el modo "sin base de datos" también se vea correcto.

Ejemplo real (uno de muchos) para que Cursor vea el formato de contenido esperado, tal como aparece en el catálogo oficial:

> **Shine Gloss** — Óleo Capilar Ultraligero. Brillo espejo, control de frizz, puntas pulidas sin efecto grasoso. Blend Hidratante Molecular (cacay, camelia, macadamia, jojoba, buriti, sacha inchi, argán, linaza). Contenido: 45 mL. Precio público: $37.000 (más adelante en el catálogo aparece un precio mayorista de referencia — validar el vigente). Categoría: Capilar.

---

## 7. Políticas legales — contenido real (reemplazo obligatorio)

Esto es **crítico**: hoy, `web/app/(store)/politicas-envio/page.tsx` tiene contenido de ejemplo que **contradice directamente** la política real de Four Sensations (dice "envío gratis en compras mayores a $130.000", "Bogotá Express: recibe hoy", "recogida en tienda gratis" — nada de eso aplica a Four Sensations, que despacha desde Manizales, no ofrece recogida en tienda ni entrega same-day, y no tiene un umbral de envío gratis confirmado en los documentos que tengo). Publicar esto tal cual sería **legalmente engañoso** para los clientes. Debe reemplazarse antes de lanzar, no es un detalle estético.

Igual pasa con `politicas-privacidad/page.tsx` y `terminos-condiciones/page.tsx`: deben reflejar la política real de datos personales de FOUR SENSATIONS S.A.S. (NIT 901.038.691-2).

### 7.1 Envíos, cambios, devoluciones, garantías, retracto y reversión del pago (resumen fiel al PDF oficial)

- **Envíos:** se despachan desde Manizales, Caldas (Calle 65A #23A-15). Plazo máximo de **2 días hábiles** desde la confirmación del pedido para preparar y despachar (este plazo es solo el proceso interno, no incluye el tránsito de la transportadora). Cobertura a todo Colombia. Transportadora principal: **Envía**; para municipios/zonas con reexpedición: **Interrapidísimo**. No se compromete una fecha exacta de entrega porque depende de la transportadora.
- **Novedades de transporte** (retraso, "entregado" pero no recibido, producto faltante/equivocado/roto/abierto/derramado): reportar **dentro de las primeras 24 horas** posteriores a la entrega registrada por la transportadora, con evidencia fotográfica/video (caja antes y durante apertura, estado exterior, guía, productos, daños visibles).
- **Cambios y devoluciones comerciales:** **no se aceptan** por gusto personal, elección equivocada, cambio de opinión o resultado cosmético distinto al esperado — por ser productos cosméticos/de cuidado personal (higiene, seguridad, trazabilidad). Un producto que ya salió de las instalaciones no puede reingresar al inventario. Esto no afecta la garantía legal ni la reversión de pago cuando aplique.
- **Garantía legal:** Four Sensations responde por calidad, idoneidad y seguridad del producto conforme a la ley colombiana. Un resultado cosmético distinto al esperado **no** equivale por sí solo a un producto defectuoso (los resultados varían según cabello, cuero cabelludo, procesos previos, hábitos, etc.).
- **Compra en distribuidor:** el reclamo inicial se hace en el punto donde se compró; Four Sensations puede acompañar la validación si corresponde.
- **Derecho de retracto:** la ley colombiana lo contempla para ventas a distancia/no tradicionales (Ley 1480 de 2011), **pero tiene excepción legal para bienes de uso personal** — como suele ser el caso de los productos cosméticos de Four Sensations —, sin perjuicio de la garantía legal.
- **Reversión del pago** (compras con tarjeta/medio electrónico): procede en casos de fraude, operación no solicitada, producto no recibido, producto distinto al pedido o producto defectuoso. Debe solicitarse dentro de los **5 días hábiles** siguientes al hecho, reclamando ante Four Sensations **y** notificando al emisor del medio de pago, conforme a la Ley 1480 de 2011.
- **Canales de atención:** atencionalcliente.befs@gmail.com · WhatsApp 304 363 2492 · horario 9 a.m.–6 p.m. · Manizales, Caldas.

*(El PDF completo tiene más detalle procedimental — recomiendo que Cursor use este resumen para reescribir la página, pero que tú o un abogado revisen la versión final publicada, ya que es contenido con implicaciones legales de cara al consumidor.)*

### 7.2 Tratamiento y protección de datos personales (resumen fiel al PDF oficial)

- **Responsable:** FOUR SENSATIONS S.A.S., NIT 901.038.691-2, Manizales, Caldas — Calle 65A #23A-15. Contacto: atencionalcliente.befs@gmail.com / +57 304 363 2492.
- **A quién aplica:** clientes/compradores, usuarios del sitio web, personas que contactan canales oficiales, mayoristas/distribuidores, proveedores, contratistas, trabajadores/exempleados, candidatos, participantes de promociones, visitantes de establecimientos, entre otros.
- **Finalidades generales:** gestionar pedidos, pagos, facturación, despacho, guías, atención al cliente, novedades, garantías, posventa, relaciones con mayoristas/proveedores, cumplimiento legal/tributario, auditoría/seguridad, estadísticas internas, prevención de fraude, defensa legal.
- **Finalidades comerciales/publicitarias/fidelización** (solo con autorización o base legal): informar productos nuevos, lanzamientos, promociones, descuentos, campañas, invitaciones a eventos, encuestas, personalización de comunicaciones — por correo electrónico y otros canales autorizados.
- **Datos sensibles:** solo se tratan cuando es indispensable, informando finalidad, carácter opcional (cuando aplique) y solicitando autorización explícita cuando la ley lo exija; nunca se condiciona un servicio a dar información sensible innecesaria.
- **Menores de edad:** la recolección de datos no está dirigida específicamente a menores; si excepcionalmente aplica, se siguen las reglas especiales de la ley colombiana (interés superior del menor, autorización del representante legal, etc.).
- **Derechos del titular:** conocer, acceder, actualizar, rectificar, pedir prueba de la autorización, ser informado del uso, consultar, reclamar, suprimir (cuando proceda), revocar autorización, quejarse ante la SIC, y abstenerse de responder preguntas sobre información sensible facultativa.
- **Procedimiento de consultas:** respuesta en máx. **10 días hábiles** (prorrogable 5 días hábiles adicionales informando motivo).
- **Procedimiento de reclamos:** si está incompleto, se requiere completar en 5 días hábiles (se entiende desistido si pasan 2 meses sin respuesta); una vez completo, respuesta en máx. **15 días hábiles** (prorrogable 8 días hábiles adicionales informando motivo).
- **Seguridad y confidencialidad:** medidas técnicas/administrativas/humanas razonables; obligación de confidencialidad que puede mantenerse tras terminar la relación laboral/contractual.
- **Canal para ejercer derechos:** el mismo correo, WhatsApp y dirección de arriba.

---

## 8. Plan de trabajo por fases (dáselo a Cursor tal cual, en orden)

### Fase 1 — Rebranding textual y metadatos (bajo riesgo, alto volumen)
Buscar y reemplazar "GinnaBeauty" / "Ginna Beauty" / "Ginna" por "Four Sensations" en textos visibles, `<title>`, `metadata` de Next.js, `package.json` (`name`), `README.md`, comentarios de código donde tenga sentido. Ya identifiqué **~58 archivos** en `web/` que contienen la cadena "ginnabeauty" (código + docs), entre ellos:

```
app/(store)/(catalog)/combos/page.tsx        app/(store)/(catalog)/mayorista/page.tsx
app/(store)/checkout/*.tsx|css                app/(store)/legal-pages.css
app/(store)/politicas-envio/page.tsx          app/(store)/politicas-privacidad/page.tsx
app/(store)/terminos-condiciones/page.tsx     app/admin/layout.tsx
app/api/admin/import/bulk/[jobId]/commit/route.ts
app/api/admin/products/route.ts               app/api/payments/epayco/session/route.ts
app/design-system.css  app/layout.tsx  app/store-experience*.css  app/wholesale-landing.css
components/admin/AdminApp.tsx  AdminCustomersPanel.tsx  AdminFamiliesPanel.tsx  AdminLoginForm.tsx
components/admin/AdminZeroPriceTools.tsx      components/brand/BrandLogo.tsx
components/store/BeautyAiAdvisor.tsx  CheckoutPageClient.tsx  CheckoutResultadoClient.tsx
components/store/CombosPromo.tsx      components/store/GinnaInnovationStrip.tsx  (← nombre de componente incluye la marca)
components/store/LegalPageShell.tsx   StoreFloatingActions.tsx  StoreHomeClient.tsx  StorefrontShell.tsx
components/store/WholesaleLandingClient.tsx   components/store/tints/*.tsx|css
data/mock-products.ts   docs/ADMIN_AUTH.md  EPAYCO_SANDBOX_VALIDATION.md  GOOGLE_OAUTH.md
lib/admin/customer-crm.ts  lib/ai-advisor*.ts  lib/ai-spend/pricing.ts
lib/bulk-import/bulk-field-diff.ts  lib/bulk-import/csv-templates.ts
lib/server/checkout/create-order.ts  lib/server/email/*.ts  lib/server/epayco/env.ts
lib/server/product-ai-openai.ts  lib/server/store-advisor-openai.ts
lib/store-topbar-messages.ts  lib/storefront-contact.ts
package.json  package-lock.json  prisma/schema.prisma  prisma/seed.ts
```
Nota: algunos son solo comentarios o nombres de variable internos (bajo impacto), otros son copy visible al usuario (alto impacto: `checkout`, `politicas-*`, `mayorista`, `StoreHomeClient`, `WholesaleLandingClient`, emails transaccionales). Prioriza lo visible al cliente primero. `GinnaInnovationStrip.tsx` es un componente completo nombrado por la marca — renómbralo (p. ej. `BrandInnovationStrip.tsx`) y actualiza sus imports.

También revisar el asesor de IA (`lib/ai-advisor-persona.ts`, `lib/ai-advisor-context.ts`, `lib/ai-advisor.ts`) — probablemente tiene un "personaje"/tono de marca escrito para GinnaBeauty que debe reescribirse con la voz de Four Sensations (femenina, colorida, cercana, "Club de los Cabellos Perfectos"), usando la sección 3 de este documento.

### Fase 2 — Identidad visual
- Sustituir logos y favicons (rutas listadas en la sección 4) por los assets de Four Sensations (`logo-principal-foursensations.png`, `isotipo-corazon-foursensations.png`, `logo-blanco-sobre-lila.png` — adjuntos a este documento; ideal reemplazarlos luego por el vectorial original del diseñador).
- Actualizar los tokens `:root` de `design-system.css` con la paleta oficial de la sección 4.3 y el mapeo de la sección 4.7 (6 colores oficiales + derivados propuestos para hover/texto).
- Cargar la Google Font sans serif que definas (sección 10, punto 1) como `--font-body`, y una script/cursiva similar a "212 Baby Girl" como `--font-accent` para títulos creativos y frases de campaña. `--font-display` puede quedar reservado solo para el logo (imagen, no texto real).
- Aplicar el tono de voz de la sección 4.6 a todo el copy visible: hero, banners, CTAs, microcopy de carrito/checkout.
- Revisar banners de categoría en `public/categorias/` y `productos/imagenes/banners/`: decidir si se conservan (son fotografía de stock genérica, sirven como placeholder de buena calidad) o se reemplazan por fotografía real de producto/marca con el estilo fotográfico de la sección 4.5 (fondos pastel, luz luminosa, producto protagonista).

### Fase 3 — Navegación y categorías
- Ajustar `web/lib/menu-config.ts` según la respuesta a la pregunta de la sección 5 (¿catálogo real solo capilar+accesorios, o también piel/maquillaje/hombres/uñas?).
- Revisar `web/lib/store-categories.ts`, `web/lib/category-labels.ts`, `web/lib/category-banners.ts`, `web/lib/category-showcase.ts` para que los nombres/slugs coincidan con las categorías finales.

### Fase 4 — Catálogo de productos
- Seguir el plan de la sección 6 (CSV + carga masiva, no hardcodear productos).
- Actualizar/retirar `data/mock-products.ts` como fallback de desarrollo.

### Fase 5 — Páginas legales (alto cuidado, ver sección 7)
- Reescribir `politicas-envio`, `politicas-privacidad`, `terminos-condiciones` con el contenido real resumido arriba (idealmente expandido con el texto completo de los PDF, no solo el resumen).
- Quitar cualquier promesa que no aplique a Four Sensations (envío gratis a partir de X, recogida en tienda, entrega same-day en Bogotá, etc.) salvo que confirmes que sí aplican.

### Fase 6 — Datos de contacto y footer
- WhatsApp flotante / footer / checkout: reemplazar número y correo por los oficiales (sección 3).
- Revisar `lib/storefront-contact.ts` y `lib/store-topbar-messages.ts` (mensajes rotativos del topbar — hoy probablemente dicen algo de envío gratis/Bogotá, deben decir algo verídico de Four Sensations).

### Fase 7 — Cuentas de servicio y variables de entorno (las gestionas tú, no Cursor)
Ver sección 9. Cursor no puede crear estas cuentas por ti; solo puede ayudarte a configurar el `.env.local` una vez las tengas.

### Fase 8 — QA final
- `npm run build` debe pasar sin errores.
- Revisar visualmente checkout, panel admin, páginas legales y home en local antes de desplegar.
- Confirmar que ningún texto/imagen de GinnaBeauty quede visible (repetir el grep de la Fase 1 y validar 0 resultados en archivos de cara al usuario).

---

## 9. Variables de entorno / cuentas que debes crear a nombre de Four Sensations

Definidas en `web/.env.example` (nombres de variable, sin valores — los valores reales nunca deben commitearse a Git):

- **Base de datos:** `DATABASE_URL`, `DIRECT_URL` (PostgreSQL — hoy vía Neon).
- **Auth:** `AUTH_SECRET`, `AUTH_TRUST_HOST`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- **Sitio:** `NEXT_PUBLIC_SITE_URL` (dominio final de Four Sensations, aún por definir).
- **Bunny CDN (imágenes):** `BUNNY_STORAGE_API_KEY`, `BUNNY_STORAGE_ZONE_NAME`, `BUNNY_STORAGE_REGION`, `BUNNY_CDN_BASE_URL`.
- **ePayco:** `EPAYCO_PUBLIC_KEY`, `EPAYCO_PRIVATE_KEY`, `EPAYCO_TEST`, `EPAYCO_API_BASE_URL`, `EPAYCO_RESPONSE_URL`, `EPAYCO_CONFIRMATION_URL`, `EPAYCO_CUSTOMER_ID`, `EPAYCO_P_KEY`, `EPAYCO_MERCHANT_NAME`, `EPAYCO_VALIDATION_BASE_URL`.
- **Bold:** `BOLD_SECRET_KEY`, `NEXT_PUBLIC_BOLD_API_KEY`.
- **WhatsApp:** `NEXT_PUBLIC_WHATSAPP_NUMBER` → debe quedar `+573043632492`.
- **Resend (email transaccional):** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_NOTIFY_EMAIL`.

Todas estas cuentas (Neon, Google OAuth, Bunny, ePayco/Bold, Resend, dominio, Render) deben crearse/transferirse **a nombre de Four Sensations S.A.S.**, no puedes seguir usando las credenciales de GinnaBeauty. Yo puedo ayudarte a redactar los formularios, pero la creación de cuentas y el pago de esos servicios lo haces tú directamente.

---

## 10. Lo que necesito que me confirmes o me compartas (para avanzar sin adivinar)

Ya resuelto ✅: paleta de colores oficial, tipografías (parcial), tono de voz, sistema de logo — ver sección 4, extraído directo del Manual de Marca 2026.

Pendiente:

1. **Nombre exacto de la tipografía sans serif de apoyo** (para cuerpo de texto) — el manual solo dice "sans serif limpia" sin nombrar la fuente específica. Si no la tienes definida en otro archivo del diseñador, te sugiero elegir una Google Font afín (Poppins, Quicksand, Nunito, Baloo 2) y la fijamos como estándar del proyecto.
2. **Archivo vectorial original del logo** (SVG/AI/EPS) — los PNG que extraje del manual sirven para maquetar la web, pero para impresión/escalado sin pérdida necesitas el archivo fuente del diseñador.
3. **HEX exacto del dorado decorativo y del morado oscuro de títulos** que se ven en el manual pero no están en la tabla de 6 colores oficiales (sección 4.7) — si el diseñador te los puede confirmar, mejor que mi aproximación derivada.
4. **Alcance real del catálogo:** ¿hoy Four Sensations vende maquillaje, cuidado facial, línea de hombres y uñas, o el negocio actual es 100% capilar + accesorios + mayoristas?
5. **Redes sociales** (Instagram, TikTok, Facebook — usuarios/links) para el footer y metadatos SEO/Open Graph.
6. **Dominio final** del sitio (para `NEXT_PUBLIC_SITE_URL` y SEO).
7. **Política de envío gratis / mínimo de compra**, si existe uno (el PDF de políticas no menciona un umbral de envío gratis — hoy la plantilla dice "$130.000" de ejemplo, que probablemente no aplica).
8. **Confirmación del catálogo completo con precios actualizados** (el PDF que tengo puede no ser 100% el precio vigente) — si quieres, puedo ayudarte a convertir el PDF completo en un CSV/Excel listo para la carga masiva del admin.

---

## 11. Mi rol como asistente del proyecto

A partir de aquí quedo como apoyo continuo de este proyecto — puedes pedirme, por ejemplo:
- Convertir el `CATÁLOGO DE PRODUCTOS.pdf` completo en un CSV/Excel para la carga masiva del panel admin.
- Redactar el texto final y completo de las tres páginas legales (no solo el resumen de la sección 7) listo para pegar en el código.
- Revisar cambios que hagas/que haga Cursor y detectar menciones sobrantes de "GinnaBeauty".
- Redactar copy de marketing (hero, banners, newsletter, descripciones de producto) con la voz de Four Sensations.
- Una vez me compartas los colores/tipografía/logo del manual de marca, dejar listo el mapeo exacto de tokens CSS.
- Ayudarte a preparar los textos para configurar las cuentas de servicio (Bunny, ePayco, Resend, etc.).

Cuando tengas avances de Cursor o dudas puntuales, tráemelos aquí y seguimos.
