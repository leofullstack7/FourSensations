# Emma — conocimiento y motor

Fuentes en `source/` (Excel + instructivo, oct 2026).

- `flow.ts` + `knowledge.ts`: motor + pack versionable.
- `explanations.ts`: copy «¿Por qué para mí?».
- Persistencia: `SiteSettings.data.emmaKnowledge` (borrador / publicado / historial).
- API admin: `PUT/GET /api/admin/emma/knowledge` (save, publish, restore, reset).
- API tienda: `GET /api/store/emma/knowledge`.
- Admin → **Centro de Emma**: simulador, editar borrador, publicar, historial.
