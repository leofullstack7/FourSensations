# Bitácora de desarrollo — Four Sensations

Documento vivo del trabajo **solo** sobre la tienda Four Sensations (`web/` de este folder).  
Fuente de marca: `GUIA_FOURSENSATIONS_CURSOR.md`.

Última actualización: 2026-09-06.

---

## Regla fija (no negociable)

- **GinnaBeauty es otro producto.** No se edita su sitio, no se toca su HTML legacy de producción, **no se hace `git push` a `origin`** mientras el remote sea `github.com/leofullstack7/ginnabeauty.git`.
- **No se despliega** este trabajo sobre Render / dominio de GinnaBeauty.
- Four Sensations tendrá su propio repo, variables y hosting cuando toque (Fase 7).
- Archivos de raíz `index.html`, `admin.html`, `main.js`, `style.css`: plantilla legacy de Ginna. **No modificarlos** para este proyecto.

Trabajar únicamente en `web/` + esta bitácora + la guía de marca.

---

## Cómo ver Four Sensations

```bash
cd web
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).  
Si el CSS no refresca: `npm run dev:clean`.

---

## Estado por fases

### Fase 1 — Textos — hecha (2026-09-01)

Copy, metadatos, WhatsApp, email, asesor IA, topbar.

### Fase 2 — Identidad visual — hecha (2026-09-06)

Paleta oficial, Nunito + Great Vibes, logos en `web/assets/foursensations/`.

### Fase 3 — Categorías — hecha (2026-09-06)

Según el catálogo PDF de Four Sensations (capilar + accesorios + mayorista), el menú público muestra solo:

- Cuidado capilar (tratamientos, shampoos/rutinas, finalizadores, tónicos, fragancias, multiuso)
- Accesorios (capilar)
- Mayorista

Maquillaje, cuidado piel, hombres y uñas quedan fuera del nav de tienda (siguen pudiendo existir en admin/DB para más adelante).

### Fase 4 — Catálogo — borrador (2026-09-06)

CSV de carga masiva: `web/docs/catalogo-foursensations-borrador.csv`  
Precios del PDF pueden no estar vigentes: validar antes del commit en admin.

### Fase 5 — Legales — hecha (2026-09-06)

Reescritas `politicas-envio`, `politicas-privacidad`, `terminos-condiciones` con el contenido oficial resumido (Manizales, Envía, sin envío gratis inventado, sin recogida en tienda, sin same-day Bogotá). Revisar con abogado antes de publicar.

### Fase 6 — Contacto / checkout — hecha (2026-09-06)

Zonas de envío sin pick-up ni umbral de envío gratis. Transportadoras: Envía / Interrapidísimo. Footer sin redes inventadas.

### Fase 7 — Cuentas — pendiente (tú)

Crear Neon, ePayco, Bunny, Resend, OAuth, dominio y Render **a nombre de Four Sensations**. No reutilizar el `.env` ni el deploy de GinnaBeauty.

### Fase 8 — QA — pendiente

Build local, grep de copy visible, no push a ginna.

---

## Paleta rápida

```
#C9A6E8  morado  #F6B7D7  rosa  #F8E7A6  amarillo
#BFE8D7  menta   #F5F1F8  lavanda fondos  #8A5FB0 títulos
Nunito + Great Vibes
```

---

## Pendiente de confirmar

1. Precios vigentes del catálogo.
2. Tarifas reales de envío (hoy hay valores de referencia en checkout, no un umbral de envío gratis).
3. Redes sociales y dominio.
4. SVG del logo.
5. ¿Hay más categorías además de capilar/accesorios?
