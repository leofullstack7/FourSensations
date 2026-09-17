import { NextResponse } from "next/server";
import "@/lib/load-env";
import { getBunnyStorageConfig } from "@/lib/server/bunny-config";

/**
 * Solo desarrollo: comprueba si el proceso ve variables críticas (sin exponer valores).
 * GET /api/dev/env-check
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const zone =
    process.env.BUNNY_STORAGE_ZONE_NAME?.trim() || process.env.BUNNY_STORAGE_ZONE?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || null;
  const googleConfigured =
    !!process.env.GOOGLE_CLIENT_ID?.trim() && !!process.env.GOOGLE_CLIENT_SECRET?.trim();
  const expectedRedirectUris = [
    "http://localhost:3000/api/auth/callback/google",
    ...(siteUrl && !siteUrl.includes("localhost")
      ? [`${siteUrl}/api/auth/callback/google`]
      : []),
  ];
  return NextResponse.json({
    cwd: process.cwd(),
    nodeEnv: process.env.NODE_ENV,
    hasAuthSecret: Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length > 0),
    hasGoogleOAuth: googleConfigured,
    googleOAuth: googleConfigured
      ? {
          expectedRedirectUris,
          expectedJavaScriptOrigins: [
            "http://localhost:3000",
            ...(siteUrl && !siteUrl.includes("localhost") ? [siteUrl] : []),
          ],
          authUrlEnv: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? null,
          fix:
            "Si Google muestra redirect_uri_mismatch, registra expectedRedirectUris en Google Cloud Console → Credenciales → OAuth 2.0 → URIs de redirección autorizados. Ver docs/GOOGLE_OAUTH.md",
        }
      : null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.length > 0),
    hasDirectUrl: Boolean(process.env.DIRECT_URL && process.env.DIRECT_URL.length > 0),
    hasBunnyStorageApiKey: Boolean(process.env.BUNNY_STORAGE_API_KEY?.trim()),
    hasBunnyStorageZone: Boolean(zone && zone.length > 0),
    hasBunnyCdnBaseUrl: Boolean(process.env.BUNNY_CDN_BASE_URL?.trim()),
    bunnyResolvedStorageHost: getBunnyStorageConfig()?.storageApiHostname ?? null,
    note:
      "Login admin: usuario ADMIN en la base (seed con SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD). Ya no se usa ADMIN_BOOTSTRAP_*.",
    hint:
      "Si has* es false, el archivo .env.local no está en la carpeta foursensations/ o falta reiniciar npm run dev.",
  });
}
