/**
 * Fetch compartido del panel admin: cookies, sin cache y reintentos ante
 * caídas de red / cold start (el típico "Failed to fetch").
 */

const DEFAULT_TIMEOUT_MS = 35_000;
const MAX_ATTEMPTS = 3;
const RETRY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String((err as { name?: string }).name) : "";
  return name === "AbortError";
}

function isRetryableNetworkError(err: unknown): boolean {
  if (isAbortError(err)) return true;
  if (!(err instanceof Error)) return true;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("fetch failed") ||
    msg.includes("aborted")
  );
}

export function friendlyAdminNetworkError(err: unknown): string {
  if (isAbortError(err)) {
    return "La solicitud tardó demasiado. Reintentando… Si persiste, recarga el panel.";
  }
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (!msg || /failed to fetch/i.test(msg) || /networkerror/i.test(msg) || /fetch failed/i.test(msg)) {
      return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
    }
    return msg;
  }
  return "No se pudo conectar con el servidor. Inténtalo de nuevo.";
}

export async function parseAdminError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string; hint?: string };
    const base = j.error || res.statusText || `Error ${res.status}`;
    if (j.hint) return `${base} — ${j.hint}`;
    return base;
  } catch {
    return res.statusText || `Error ${res.status}`;
  }
}

export type AdminFetchInit = RequestInit & {
  /** Desactiva reintentos (p. ej. uploads largos ya controlados). */
  noRetry?: boolean;
  timeoutMs?: number;
};

export async function adminFetch(input: RequestInfo | URL, init: AdminFetchInit = {}): Promise<Response> {
  const { noRetry = false, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const maxAttempts = noRetry ? 1 : MAX_ATTEMPTS;

  const baseHeaders = new Headers(rest.headers ?? undefined);
  if (!baseHeaders.has("Accept")) baseHeaders.set("Accept", "application/json");

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const externalSignal = rest.signal;
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(input, {
        ...rest,
        credentials: rest.credentials ?? "include",
        cache: rest.cache ?? "no-store",
        headers: baseHeaders,
        signal: controller.signal,
      });

      if (RETRY_STATUSES.has(res.status) && attempt < maxAttempts) {
        await sleep(350 * attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && isRetryableNetworkError(err)) {
        await sleep(450 * attempt);
        continue;
      }
      throw new Error(friendlyAdminNetworkError(err));
    } finally {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
    }
  }

  throw new Error(friendlyAdminNetworkError(lastError));
}
