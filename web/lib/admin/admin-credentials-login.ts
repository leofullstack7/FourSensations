import { getCsrfToken } from "next-auth/react";

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "network" };

function hasAuthErrorInUrl(url: string): boolean {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return parsed.searchParams.has("error");
  } catch {
    return url.includes("error=");
  }
}

/**
 * Login admin vía POST directo al callback de Auth.js.
 * Evita el cuelgue de `signIn(..., { redirect: false })`, que a veces no resuelve
 * tras esperar la actualización de sesión en cliente.
 */
export async function submitAdminCredentialsLogin(
  username: string,
  password: string,
  callbackUrl: string
): Promise<AdminLoginResult> {
  const csrfToken = await getCsrfToken();
  if (!csrfToken) return { ok: false, reason: "network" };

  let res: Response;
  try {
    res = await fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      credentials: "same-origin",
      body: new URLSearchParams({
        csrfToken,
        username: username.trim(),
        password,
        callbackUrl,
      }),
    });
  } catch {
    return { ok: false, reason: "network" };
  }

  let data: { url?: string } = {};
  try {
    data = (await res.json()) as { url?: string };
  } catch {
    return { ok: false, reason: "network" };
  }

  const target = data.url?.trim() || callbackUrl;
  if (!res.ok || hasAuthErrorInUrl(target)) {
    return { ok: false, reason: "invalid" };
  }

  window.location.replace(target);
  return { ok: true };
}
