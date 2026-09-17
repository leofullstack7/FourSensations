# Guía de validación ePayco (sandbox) — GinnaBeauty

Contexto del proyecto: Smart Checkout v2 (Apify) + widget `checkout-v2.js` con `test: true|false` según `EPAYCO_TEST`. La confirmación del pago es **servidor a servidor** (webhook), no la página de respuesta del navegador.

---

## 1. Cómo confirmar que el checkout está en modo prueba

### Desde el código

- **Variable de entorno:** `EPAYCO_TEST=true` en `.env.local` / panel del hosting. En `web/lib/server/epayco/env.ts` se interpreta como booleano y se envía al cliente en la respuesta de `POST /api/payments/epayco/session` como campo **`test`**.
- **Checkout (frontend):** en `CheckoutPageClient` se llama `ePayco.checkout.configure({ sessionId, type: "onpage", test: Boolean(data.test) })`. Si `test` es `true`, el widget debe operar en **modo pruebas** (según documentación ePayco).
- **Logs del servidor:** tras crear la sesión, el route handler registra una línea:
  - `[epayco] session creada` con `{ test, reference, amount, sessionIdPrefix }`.
  - Comprueba en logs de Vercel/Node que **`test: true`** durante sandbox.

### Desde la UI

- ePayco suele mostrar **indicadores de transacción de prueba** (texto o marca de agua según versión del checkout). Si solo ves medios “reales” pero el panel de ePayco marca la transacción como prueba, sigue siendo válido para sandbox.
- En el **dashboard de ePayco**, las transacciones de prueba suelen listarse con marca de **test** / entorno de pruebas (nomenclatura según tu cuenta).

---

## 2. Qué medios de pago probar primero (sandbox)

Orden recomendado para validar el flujo completo sin fricción:

1. **PSE (si está habilitado en sandbox)** — muy usado en Colombia; confirma redirección y vuelta a `checkout/resultado`.
2. **Tarjeta de prueba** — usa los **datos de prueba** que indique el **manual o panel de ePayco** para tu cuenta (números, CVV, OTP simulado). No uses tarjetas reales en `EPAYCO_TEST=true` si el proveedor lo desaconseja.
3. **Efectivo / otros** — solo si aparecen en el checkout y el sandbox los soporta para tu comercio.

**Importante:** los medios disponibles dependen de **país (`country: "CO"`)**, **configuración de la cuenta** y **políticas de sandbox** de ePayco, no solo de tu código.

---

## 3. ¿Solo PSE o también otros medios?

En este proyecto, el payload de sesión en `web/app/api/payments/epayco/session/route.ts` **no** envía `methodsDisable` ni restringe explícitamente a PSE. Por tanto:

- Lo que veas (solo PSE, PSE + tarjetas, etc.) lo determina principalmente **ePayco** según:
  - tipo de comercio / país,
  - **modo prueba vs producción**,
  - y la **configuración del comercio** en el dashboard.

Si en sandbox solo aparece PSE, puede ser **normal** hasta que actives o habilitites otros medios en el panel o hasta pasar a un entorno con más opciones.

---

## 4. Cómo saber si la limitación viene de ePayco, del payload o de la cuenta

| Origen | Qué revisar |
|--------|-------------|
| **Payload (tu código)** | Objeto enviado a Apify `POST .../payment/session/create`: busca `methodsDisable`, `method`, `country`, `amount`. Aquí no se fuerza un solo método salvo que añadas `methodsDisable`. |
| **Cuenta / comercio** | Panel ePayco: medios habilitados, restricciones, país, moneda COP, permisos de prueba. |
| **ePayco / sandbox** | Comportamiento distinto entre test y prod; algunos medios no aparecen en pruebas. |

**Prueba rápida:** guarda en `Order.providerPayload` (ya se persiste en BD) el cuerpo enviado (sin secretos) y compáralo con la documentación. Si el payload no deshabilita métodos y aun así solo ves uno, el origen es casi seguro **cuenta o reglas de ePayco**.

---

## 5. Logs a revisar al crear la sesión

| Dónde | Qué buscar |
|-------|------------|
| **Servidor (Vercel / terminal `next dev`)** | `[epayco] session creada` — confirma `test`, `reference`, `amount`. Errores `[epayco] create session` o `[epayco] Apify login falló` en `web/lib/server/epayco/apify-client.ts`. |
| **Red del navegador (DevTools → Network)** | Respuesta de `POST /api/payments/epayco/session`: debe incluir `sessionId`, `test`, `reference`. Status 502/503 indica fallo Apify o URLs. |
| **Consola del navegador** | Mensajes `[checkout] ePayco widget creado` o errores en `onErrors` del widget. |

---

## 6. Datos que deberían quedar en BD tras una compra de prueba

Tabla **`Order`** (y **`OrderItem`**):

| Campo | Qué esperar tras prueba exitosa (webhook) |
|-------|-------------------------------------------|
| `reference` | Tu referencia interna (`GB-...`), coincide con `invoice` / `x_id_invoice` en webhook. |
| `status` | `PAID` si `x_response` es aceptada (lógica en `apply-confirmation.ts`). |
| `paymentStatus` | `APPROVED` u otro según respuesta. |
| `paymentProvider` | `"EPAYCO"`. |
| `providerTransactionId` | ID de transacción ePayco (`x_transaction_id` o similar). |
| `epaycoSessionId` | ID de sesión Smart Checkout (si se creó sesión). |
| `providerPayload` | Resumen del body enviado a crear sesión (sin llaves secretas). |
| `responseData` | Opcional: datos de la URL de respuesta (no son fuente de verdad del cobro). |
| `confirmationData` | **JSON del webhook** — fuente de verdad; debe incluir firma y campos `x_*` según ePayco. |

**OrderItem:** líneas con precios snapshot; **Product.stock** debería decrementarse solo al aprobar el pago (idempotente).

---

## Checklist rápido sandbox

- [ ] `EPAYCO_TEST=true`
- [ ] `EPAYCO_PUBLIC_KEY` / `EPAYCO_PRIVATE_KEY` de **prueba** (Apify)
- [ ] `EPAYCO_RESPONSE_URL` y `EPAYCO_CONFIRMATION_URL` accesibles públicamente (o `NEXT_PUBLIC_SITE_URL` para construirlas)
- [ ] Webhook: `EPAYCO_CUSTOMER_ID` + `EPAYCO_P_KEY` para validar firma en producción; en desarrollo sin ellas el código puede ser más permisivo
- [ ] Tras pagar, pedido en BD con `confirmationData` relleno y estado coherente

Referencias oficiales: [Implementación Smart Checkout](https://docs.epayco.com/docs/checkout-implementacion), [Respuesta y confirmación](https://docs.epayco.com/docs/checkout-respuesta-y-confirmacion).
