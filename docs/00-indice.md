# 00 — Índice de guías Four Sensations

Carpeta de instrucciones numeradas. **Solo se crea un archivo cuando tú lo pidas.**  
Este índice es el mapa del orden.

---

## Cómo está el repo

```
FourSensations/
├── docs/                          ← estas guías (tú mandas cuándo crear cada una)
├── foursensations/                ← la tienda Next.js
│   ├── marca/                     ← guía de marca + carpeta fuente/
│   └── …                          ← app Next.js (antes `web/`)
├── referencia/
│   └── ginnabeauty/               ← plantilla. SOLO lectura.
│       ├── html-legacy/           ← index.html, admin.html, main.js, style.css
│       ├── docs/                  ← DESPLIEGUE / MIGRATION de Ginna
│       ├── igora/                 ← assets de tintes (referencia)
│       └── productos/             ← imágenes locales de la plantilla
└── README.md
```

- **GinnaBeauty** = referencia de plantilla. No se edita para este proyecto. No se hace push a su GitHub ni a su Render.
- **Four Sensations** = lo único que construimos. Código en `foursensations/`. Ver en local: `cd foursensations` → `npm run dev` → http://localhost:3000

---

## Numeración

| # | Archivo | Estado |
|---|---------|--------|
| 00 | Este índice | Activo |
| 01–06 | Guías de fases ya hechas en código (textos, visual, menú, catálogo, legales, contacto) | **No escritas aún** — pídelas si las quieres documentadas |
| **07** | [07-cuentas-de-servicio.md](./07-cuentas-de-servicio.md) | **En curso** — cuentas propias, sin usar las de GinnaBeauty |
| **08** | [08-estado-propuesta.md](./08-estado-propuesta.md) | **Activo** — qué está hecho y qué falta (guía + sesiones) |
| **09** | [09-cambios-juliana-home.md](./09-cambios-juliana-home.md) | **En curso** — feedback WhatsApp Juliana (home, Emma, footer) |

---

## Reglas fijas

1. No `git push origin` mientras el remote sea `github.com/leofullstack7/ginnabeauty.git`.
2. No `prisma db push` / seed contra el Neon de GinnaBeauty.
3. No copiar `.env` de Ginna a producción de Four Sensations.
4. Las siguientes guías se crean **solo cuando las indiques**.
