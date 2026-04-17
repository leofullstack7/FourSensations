import { assertApifyKeys, getEpaycoServerConfig } from "@/lib/server/epayco/env";

type ApifyLoginResponse = { token: string };

type SessionCreateBody = Record<string, unknown>;

type SessionCreateResponse = {
  success?: boolean;
  data?: { sessionId?: string; token?: string };
  titleResponse?: string;
  textResponse?: string;
};

let cachedToken: { token: string; expiresAtMs: number } | null = null;

function base64UrlToJson(payload: string): Record<string, unknown> | null {
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const buf = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(buf) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Decodifica exp (segundos) del JWT Apify sin verificar firma (solo cache TTL). */
function jwtExpiryMs(jwt: string): number | null {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  const payload = base64UrlToJson(parts[1]);
  const exp = payload?.exp;
  if (typeof exp === "number") return exp * 1000;
  return null;
}

async function loginApify(): Promise<string> {
  const { publicKey, privateKey } = assertApifyKeys();
  const { apiBaseUrl } = getEpaycoServerConfig();
  const basic = Buffer.from(`${publicKey}:${privateKey}`, "utf8").toString("base64");
  const res = await fetch(`${apiBaseUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({}),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[epayco] Apify login falló", res.status, text.slice(0, 500));
    throw new Error(`Apify login: ${res.status}`);
  }
  let json: ApifyLoginResponse;
  try {
    json = JSON.parse(text) as ApifyLoginResponse;
  } catch {
    throw new Error("Apify login: respuesta no JSON");
  }
  if (!json.token) {
    throw new Error("Apify login: sin token");
  }
  return json.token;
}

async function getBearerToken(): Promise<string> {
  const now = Date.now();
  const bufferMs = 60_000;
  if (cachedToken && cachedToken.expiresAtMs > now + bufferMs) {
    return cachedToken.token;
  }
  const token = await loginApify();
  const expMs = jwtExpiryMs(token);
  const ttlMs = expMs ? expMs - now : 45 * 60 * 1000;
  cachedToken = { token, expiresAtMs: now + Math.max(ttlMs, 120_000) };
  return token;
}

export type CreateSmartSessionInput = {
  body: SessionCreateBody;
};

/**
 * Crea sesión Smart Checkout v2. Requiere cuerpo con checkout_version, name, currency, amount, etc.
 */
export async function createSmartCheckoutSession(input: CreateSmartSessionInput): Promise<{
  sessionId: string;
  sessionToken?: string;
  raw: SessionCreateResponse;
}> {
  const { apiBaseUrl } = getEpaycoServerConfig();
  const bearer = await getBearerToken();
  const res = await fetch(`${apiBaseUrl}/payment/session/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(input.body),
  });
  const text = await res.text();
  let json: SessionCreateResponse;
  try {
    json = JSON.parse(text) as SessionCreateResponse;
  } catch {
    console.error("[epayco] session/create no JSON", text.slice(0, 400));
    throw new Error("Apify session: respuesta inválida");
  }
  if (!res.ok) {
    console.error("[epayco] session/create HTTP", res.status, text.slice(0, 600));
    throw new Error(json.textResponse || json.titleResponse || `Apify session: ${res.status}`);
  }
  const sessionId = json.data?.sessionId;
  if (!sessionId) {
    console.error("[epayco] session/create sin sessionId", JSON.stringify(json).slice(0, 400));
    throw new Error("Apify session: sin sessionId");
  }
  return {
    sessionId,
    sessionToken: json.data?.token,
    raw: json,
  };
}

