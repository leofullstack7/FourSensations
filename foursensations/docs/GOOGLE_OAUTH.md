# Login de clientes con Google (OAuth)

## Error `redirect_uri_mismatch` (400)

Google rechaza la petición cuando la **URI de redirección que envía la app** no coincide **exactamente** con alguna de las registradas en Google Cloud Console.

Auth.js (NextAuth v5) siempre usa:

```text
{ORIGEN_DE_LA_APP}/api/auth/callback/google
```

Ejemplos verificados para GinnaBeauty:

| Entorno   | URI que debes registrar en Google |
|-----------|-----------------------------------|
| Local     | `http://localhost:3000/api/auth/callback/google` |
| Producción | `https://ginnabeauty.com/api/auth/callback/google` |

**No** uses barra final, ni `127.0.0.1` si entras por `localhost`, ni `www` si el sitio redirige a dominio sin www.

## Configuración en Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → tu proyecto.
2. **APIs y servicios** → **Credenciales**.
3. Abre el cliente OAuth 2.0 (tipo **Aplicación web**) cuyo ID coincide con `GOOGLE_CLIENT_ID` en `.env.local`.
4. En **Orígenes autorizados de JavaScript**, agrega:
   - `http://localhost:3000`
   - `https://ginnabeauty.com`
5. En **URIs de redirección autorizados**, agrega las dos URIs de la tabla anterior.
6. Guarda y espera 1–2 minutos antes de probar de nuevo.

## Variables de entorno (`web/.env.local`)

```env
GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
AUTH_SECRET="..."          # obligatorio; estable entre reinicios
AUTH_TRUST_HOST=true       # recomendado en Vercel / proxy
```

Opcional en local si el host inferido falla (proxy raro):

```env
AUTH_URL="http://localhost:3000"
```

En Vercel/producción:

```env
AUTH_URL="https://ginnabeauty.com"
```

`NEXT_PUBLIC_SITE_URL` **no** define el callback de Google; solo URLs públicas de la tienda (checkout, etc.).

## Comprobar en desarrollo

Con `npm run dev` activo:

```text
GET http://localhost:3000/api/dev/env-check
```

Incluye `googleOAuth.expectedRedirectUris` con las URIs que deben estar en Google Console.

## Otros errores (no son `redirect_uri_mismatch`)

| Síntoma | Causa habitual |
|---------|----------------|
| `AccessDenied` tras volver de Google | Correo ya registrado como **ADMIN** (`auth.ts` bloquea OAuth tienda). |
| Sesión que desaparece al reiniciar | Falta o cambió `AUTH_SECRET`. |
| Botón Google no aparece | Faltan `GOOGLE_CLIENT_ID` o `GOOGLE_CLIENT_SECRET`. |
