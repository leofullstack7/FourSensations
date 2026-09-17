export type AdminLoginResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "network" | "empty" };

const LOGIN_TIMEOUT_MS = 15000;

/**
 * Login admin vía API server-side (misma estrategia que clientes de tienda).
 * Evita cuelgues del callback `/api/auth/callback/credentials` en el navegador.
 */
export async function submitAdminCredentialsLogin(
  username: string,
  password: string,
  callbackUrl: string,
): Promise<AdminLoginResult> {
  const email = username.trim();
  if (!email || !password) {
    return { ok: false, reason: "empty" };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

  try {
    const res = await fetch("/api/auth/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      signal: controller.signal,
      body: JSON.stringify({ username: email, password }),
    });

    if (res.status === 401) {
      return { ok: false, reason: "invalid" };
    }

    if (!res.ok) {
      return { ok: false, reason: "network" };
    }

    const data = (await res.json()) as { ok?: boolean };
    if (!data.ok) {
      return { ok: false, reason: "network" };
    }

    window.location.assign(callbackUrl);
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  } finally {
    window.clearTimeout(timer);
  }
}
