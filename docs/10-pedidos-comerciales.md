# 10 — Pedidos comerciales (checkout, envío, mayorista, home)

**Para:** Zoryn, al cerrar esta tanda.  
**Repo:** https://github.com/leofullstack7/FourSensations  
**Rama publicada:** `main` (commit `69919e6` + fixes locales posteriores, ver § Pendiente).  
**Local:** `cd foursensations` → `npm run dev` (en esta máquina solía estar en http://localhost:3010).

Este archivo junta **todo lo que pediste** en esta conversación y en la tanda comercial previa (Emma, mayorista, menú, footer), para que no se pierda al cerrar.

---

## 1. Envío: Envía e Interrapidísimo

Hay **dos transportadoras**. La primera opción que ve el cliente es siempre **Envía**.

- **Envía:** tiene cobertura y tarifas fijas según zona.
- **Interrapidísimo:** se usa cuando el destino **no** tiene cobertura Envía (zonas de reexpedición). El flete **se paga contraentrega** (en el checkout el envío online queda en $0; el total es solo el de productos).

Los envíos solo se ofrecen en tres zonas:

| Zona | Precio Envía |
|------|----------------|
| Manizales | $8.000 |
| Villamaría | $10.000 |
| Nacional | $15.900 |

Debajo de las zonas: **NO INCLUYE ZONAS DE REEXPEDICIÓN** (listado desplegable).

Si el cliente escribe una ciudad de esa lista, Envía se bloquea y el sistema lo manda a Interrapidísimo con el aviso: *Envía no tiene cobertura… Debes pedirlo por Interrapidísimo. El flete se paga contraentrega.*

La ciudad Manizales / Villamaría se detecta sola y ajusta la zona. El servidor vuelve a calcular zona y transportadora (no se fía del cliente).

**Archivos:**

- `foursensations/lib/checkout/shipping-zones.ts`
- `foursensations/lib/checkout/envia-exclusions.ts`
- `foursensations/lib/server/checkout/create-order.ts`
- `foursensations/components/store/CheckoutPageClient.tsx`

### Destinos sin cobertura Envía (reexpedición → Interrapidísimo)

| Destino | Departamento |
|---------|--------------|
| Achí | Bolívar |
| Albania Hotel Waya | La Guajira |
| Algarrobo | Magdalena |
| Arenal del Sur | Bolívar |
| Barranco | Bolívar |
| Cabrera | Santander |
| Campana | La Guajira |
| Chibolo | Magdalena |
| El Carmen | Norte de Santander |
| El Peñón | Bolívar |
| El Piñón | Magdalena |
| Geselca | La Guajira |
| Guamal | Magdalena |
| Guaranda | Sucre |
| Hatillo de Loba | Bolívar |
| La Playa | Norte de Santander |
| Las Flores | La Guajira |
| Majagual | Sucre |
| Manaure Balcón del Cesar | Cesar |
| Mina El Cerrejón | La Guajira |
| Montecristo | Bolívar |
| Morales | Bolívar |
| Murillo | Tolima |
| Norosí | Bolívar |
| Piojó | Atlántico |
| Pueblito Los Andes | Magdalena |
| Puerto Brisa | La Guajira |
| Puerto Guzmán | Putumayo |
| Puerto Leguízamo | Putumayo |
| Río Viejo | Bolívar |
| Rioancho | La Guajira |
| Salamina | Magdalena |
| San Sebastián | Magdalena |
| Santa Ana | Magdalena |
| Teorama | Norte de Santander |
| Tiquisio | Bolívar |
| Aguadas | Caldas |
| Aranzazu | Caldas |
| Arboletes | Antioquia |
| Arma | Caldas |
| Ayacucho | Cesar |
| Ayapel | Córdoba |
| Barbacoas | Nariño |
| Cajamarca | Tolima |
| Canalete | Córdoba |
| Cantagallo | Bolívar |
| Cerromatoso | Córdoba |
| Chimichagua | Cesar |
| Colón | Putumayo |
| Colón Génova | Nariño |
| Convención | Norte de Santander |
| Curumaní | Cesar |
| Dibulla | La Guajira |
| Ecopetrol Cicuco | Bolívar |
| El Banco | Magdalena |
| El Paso | Cesar |
| El Remolino | Cauca |
| El Retén | Magdalena |
| El Tigre | Putumayo |
| Filandia | Quindío |
| Florencia | Cauca |
| Fuente de Oro | Meta |
| González | Cesar |
| La Merced | Caldas |
| Manzanares | Caldas |
| Marmato | Caldas |
| Marulanda | Caldas |
| Pácora | Caldas |
| Pensilvania | Caldas |
| Salamina | Caldas |
| San Félix | Caldas |
| Salento | Quindío |
| Villahermosa | Tolima |
| Mocoa | Putumayo |
| Puerto Asís | Putumayo |
| Puerto Caicedo | Putumayo |
| Orito | Putumayo |
| Sibundoy | Putumayo |
| San José del Guaviare | Guaviare |
| Puerto Escondido | Córdoba |
| Puerto Libertador | Córdoba |
| Santa Rosa del Sur | Bolívar |
| Pivijay | Magdalena |
| Plato | Magdalena |

---

## 2. Checkout (copy + UI)

- Título de envío: **Elige tu Entrega** (antes “¿Cómo quieres recibir tu pedido?”).
- Se quitó: *“No hay recogida en tienda ni entrega el mismo día. No hay cambios comerciales por gusto. Políticas de envío y posventa.”*
- Texto mayorista: *“Para pedidos mayoristas o de gran volumen, el equipo puede contactarte para indicarte el valor del flete contraentrega”*.
- **ePayco → Mercado Pago** (Checkout Pro: se crea preferencia y se redirige a `init_point`).
- En PC, el sidebar de totales/pago es **sticky**: queda bajo el header del checkout y no se mete debajo del footer.

**Archivos:**

- `foursensations/components/store/CheckoutPageClient.tsx`
- `foursensations/app/(store)/checkout/checkout.css`
- `foursensations/app/api/payments/mercadopago/` (preference, webhook, sync)
- `foursensations/lib/server/mercadopago/`

**Para que el pago funcione** hay que poner en `.env.local` / producción:

```
MERCADOPAGO_ACCESS_TOKEN=...
NEXT_PUBLIC_SITE_URL=https://tudominio.com
```

Opcional: `MERCADOPAGO_NOTIFICATION_URL`, `MERCADOPAGO_WEBHOOK_SECRET`.

El código de ePayco sigue en el repo (no se borró), pero la UI del cliente ya no lo ofrece.

---

## 3. Home — topbar de frases

Frases (siguen siendo las 4 comerciales):

1. Fórmulas con Intención 🍃 Resultados reales para tu cabello
2. El Club de los Cabellos Perfectos 👱🏻‍♀️✨
3. Preparación en Máximo 2 días hábiles 📦 El tránsito lo define la transportadora
4. Despacho desde Manizales 🚚Envíos a todo Colombia 🇨🇴

- **Celular:** roll infinito en bucle, todas las frases en movimiento, separadas por `•` (estilo del marquee de referencia).
- **PC:** una frase a la vez, rotando cada **4 segundos** (antes 7,5 s).

**Archivos:** `StorefrontShell.tsx`, `app/design-system.css`, `lib/store-topbar-messages.ts`.

---

## 4. Título de la pestaña

Si el usuario se va a **otra pestaña** (no Four Sensations), el label del navegador alterna:

- `VUELVE 🔥`
- `Four Sensations`

Al volver, restaura el título original.

**Archivo:** `foursensations/components/store/TabAwayTitle.tsx` (montado en `app/providers.tsx`).

---

## 5. Mayorista (tanda previa + copy)

Página unificada: **`/mayorista`**. El menú y `/categoria/mayorista` deben llevar ahí (el redirect de categoría se corrigió después del push; ver § Pendiente).

**Hero pedido:**

- Título: **TU VITRINA ESTÁ PIDIENDO FOUR SENSATIONS 👀💗**
- Texto: *Una marca que tus clientes van a querer descubrir, probar y volver a comprar. Productos con identidad, fórmulas increíbles y una comunidad que ya ama Four Sensations.*
- **No** debe quedar el copy viejo: *“Lleva Four Sensations a tu negocio / Precios de volumen, acompañamiento 1:1…”*.

**8 razones** (títulos):

1. EMPIEZA SIN COMPLICARTE  
2. PRODUCTOS QUE DA GUSTO RECOMENDAR  
3. UN MARGEN QUE SÍ MOTIVA  
4. NO EMPIEZAS DESDE CERO  
5. TE DAMOS MATERIAL PARA VENDER MÁS  
6. TIENES MUCHO PARA OFRECER  
7. NO TE DEJAMOS SOLA  
8. VENDES MUCHO MÁS QUE PRODUCTOS  

**Reglas de negocio:**

- Registro mayorista (nombre, correo, contraseña, ciudad, dirección) + login.
- Todos los productos con precio mayorista (grande = mayorista, tachado = público).
- Mínimo primer pedido **$700.000**; si ya desbloqueó el ciclo, siguiente mínimo **$300.000**.
- Ciclo de **30 días** (acumulado / umbral).
- Catálogo completo en la misma página.

**Archivos:** `WholesaleLandingClient.tsx`, `lib/wholesale-pricing.ts`, `lib/wholesale-rules.ts`, `app/api/wholesale/me`, `app/api/auth/customer/register-wholesale`.

**Prisma:** en `User` hay `isWholesale`, `city`, `address`. Si en un entorno nuevo no existen, hay que `prisma db push` / migrate.

---

## 6. Emma, menú, footer, Sobre nosotros (tanda previa)

- **Emma móvil:** primero la presentación / copy; la consola después. Logo `emma.png` (ojo: en Linux el case del archivo importa; si el logo no carga, copiar a `public/emma.png`).
- **Megamenú Cuidado capilar:** columnas = subcategorías reales (Tratamientos, Shampoo y Acondicionador, etc.), no el agrupado viejo.
- **WhatsApp:** mensajes con emojis (FAB, soporte, mayorista, trabaja con nosotros).
- **Footer:** también en `/mayorista`. Línea Four Girl con saltos de línea. **Cuidado Corporal** al final de Productos. Chip de pago: Mercado Pago.
- **Sobre nosotros:** en móvil las cards de historia en bloque horizontal / apiladas.

---

## 7. Dónde revisar en el navegador

| Qué | URL | Qué deberías ver |
|-----|-----|------------------|
| Topbar móvil | `/` (viewport ~390) | Frases en roll continuo con `•` |
| Topbar PC | `/` | Una frase cada 4 s |
| Pestaña | Cualquier página FS → otra pestaña | Alterna VUELVE 🔥 / Four Sensations |
| Mayorista | `/mayorista` | Hero “TU VITRINA…”, 8 razones, registro, catálogo |
| Menú Mayorista | Header → Mayorista / Ver todo | Debe ir a `/mayorista`, no al copy viejo |
| Checkout envío | `/checkout` (con carrito) | Envía primero; Manizales $8k / Villamaría $10k / Nacional $15.9k |
| Reexpedición | Checkout, ciudad **Filandia** + Quindío | Envía bloqueada, Interrapidísimo, contraentrega |
| Manizales | Checkout, ciudad **Manizales** | Envía $8.000 |
| Pago | Checkout sidebar | Mercado Pago, no ePayco |
| Sticky | Checkout PC, scrollear | Resumen siempre visible bajo el header |

---

## 8. Pendiente al reabrir (importante)

1. **Fixes locales no subidos a `main`** (después de `69919e6`):
   - Quitar el import roto `@/lib/bomba-capilar` (el archivo no existe en `main`; Bomba Capilar se agrega como producto normal).
   - Redirect `/categoria/mayorista` → `/mayorista`.
   - Copy de `category-landing-theme.ts` alineado al hero comercial.
   - `resolveStoreCategoryHref` para que el menú “Ver todo Mayorista” no abra la landing vieja.
   - **Hay que commitear y pushear** estos cambios si quieres que producción deje de romper el build.

2. **`MERCADOPAGO_ACCESS_TOKEN`** aún no está configurado en el entorno (sin eso, “Pagar con Mercado Pago” falla al crear la preferencia).

3. **`prisma generate` / `db push`** si el entorno no tiene `isWholesale`, `city`, `address` en `User`.

4. Logo Emma: confirmar `public/emma.png` en el deploy (Linux es case-sensitive).

5. Precios mayorista exactos del PDF: si no estaban en el catálogo, se usó un fallback (~30% off público). Revisar si quieres los del PDF al peso.

6. No se pidió commit de este markdown; está solo en el working tree hasta que lo subas.

---

## 9. Commits de referencia

| Hash | Qué |
|------|-----|
| `f30ee5d` | Copy comercial, subcategorías capilares, cuestionario Emma |
| `f1c7601` | Unifica `/mayorista`, razones, banners, Emma |
| `69919e6` | Envía/Interrapidísimo, Mercado Pago, mayorista, topbar, VUELVE |
| *(local, sin push)* | Fix compile bomba-capilar + copy/redirect mayorista |
