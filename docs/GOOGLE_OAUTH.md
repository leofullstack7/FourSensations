# Google OAuth — login de clientes (Four Sensations)

El inicio de sesión con Google **sí funciona fuera de local**, si las URLs de la consola de Google coinciden con el dominio público. En local suele “justar” porque `http://localhost:3000` ya está autorizado.

## Variables

En `foursensations/.env.local` (y en el hosting, p. ej. Vercel):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET` (estable; si cambia, las sesiones JWT se invalidan)
- `AUTH_TRUST_HOST=true`
- `AUTH_URL` = origen exacto de la app (`http://localhost:3000` o `https://tudominio.com`, sin barra final)
- `NEXT_PUBLIC_SITE_URL` = mismo origen público en producción

## Google Cloud Console

Credenciales → OAuth 2.0:

**Orígenes de JavaScript autorizados**

- `http://localhost:3000`
- `https://tudominio.com`

**URIs de redirección autorizados** (el callback de Auth.js)

- `http://localhost:3000/api/auth/callback/google`
- `https://tudominio.com/api/auth/callback/google`

Si falta la URI de producción, Google responde `redirect_uri_mismatch`. Eso no es un fallo de la tienda: hay que registrar esa URL.

Pantalla de consentimiento: tipo **Externo**. Mientras esté en prueba, solo entran los correos añadidos como testers.

## Notas

- El correo de un usuario **ADMIN** no puede entrar por Google en la tienda.
- Tras el redirect, Auth.js crea o enlaza un `User` con rol `CUSTOMER`.
