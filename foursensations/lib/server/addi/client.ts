import {
  addiApiBaseUrl,
  addiAudience,
  addiAuthUrl,
  assertAddiConfig,
} from "@/lib/server/addi/env";

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export type AddiApplicationInput = {
  orderId: string;
  reference: string;
  totalAmount: number;
  shippingAmount: number;
  currency?: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    pictureUrl?: string | null;
  }>;
  client: {
    idNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    cellphone: string;
    addressLine: string;
    city: string;
  };
  callbackUrl: string;
  redirectionUrl: string;
  logoUrl: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAddiAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const { clientId, clientSecret } = assertAddiConfig();
  const res = await fetch(`${addiAuthUrl()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: addiAudience(),
      grant_type: "client_credentials",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    const detail = data.error_description || data.error || res.statusText;
    throw new Error(`Addi auth falló: ${detail}`);
  }

  const ttlMs = Math.max(60, Number(data.expires_in) || 3600) * 1000;
  cachedToken = { value: data.access_token, expiresAt: now + ttlMs };
  return data.access_token;
}

function cleanPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length > 10) digits = digits.slice(2);
  return digits.slice(0, 10);
}

function cleanCity(city: string): string {
  let c = stripAccents(city || "Bogota").trim();
  if (c.toLowerCase().includes("bogota")) c = "Bogota D.C";
  return c.substring(0, 60);
}

export async function createAddiOnlineApplication(
  input: AddiApplicationInput,
): Promise<{ redirectUrl: string; raw: unknown }> {
  const token = await getAddiAccessToken();
  const address = {
    lineOne: stripAccents(input.client.addressLine).substring(0, 60),
    city: cleanCity(input.client.city),
    country: "CO",
  };

  const payload = {
    orderId: input.reference,
    totalAmount: Number(input.totalAmount).toFixed(1),
    shippingAmount: Number(input.shippingAmount).toFixed(1),
    totalTaxesAmount: "0.0",
    currency: input.currency || "COP",
    items: input.items.map((i) => ({
      sku: String(i.sku).substring(0, 50),
      name: stripAccents(i.name).substring(0, 50),
      quantity: String(i.quantity),
      unitPrice: Math.round(i.unitPrice),
      tax: 0,
      ...(i.pictureUrl ? { pictureUrl: i.pictureUrl } : {}),
      category: "beauty",
      brand: "Four Sensations",
    })),
    client: {
      idType: "CC",
      idNumber: input.client.idNumber.replace(/\D/g, ""),
      firstName: stripAccents(input.client.firstName).substring(0, 50),
      lastName: stripAccents(input.client.lastName).substring(0, 50) || "Cliente",
      email: input.client.email.trim().toLowerCase(),
      cellphone: cleanPhone(input.client.cellphone),
      cellphoneCountryCode: "+57",
      address,
    },
    shippingAddress: address,
    billingAddress: address,
    allyUrlRedirection: {
      logoUrl: input.logoUrl,
      callbackUrl: input.callbackUrl,
      redirectionUrl: input.redirectionUrl,
    },
  };

  const res = await fetch(`${addiApiBaseUrl()}/v1/online-applications`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "FourSensations/1.0",
    },
    redirect: "manual",
    body: JSON.stringify(payload),
  });

  const location = res.headers.get("location") || res.headers.get("Location");
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const links =
    rec._links && typeof rec._links === "object" ? (rec._links as Record<string, unknown>) : null;
  const webRedirect =
    links?.webRedirect && typeof links.webRedirect === "object"
      ? (links.webRedirect as Record<string, unknown>)
      : null;

  const redirectUrl =
    location ||
    (typeof rec.redirectionUrl === "string" ? rec.redirectionUrl : null) ||
    (typeof rec.applicationUrl === "string" ? rec.applicationUrl : null) ||
    (typeof webRedirect?.href === "string" ? webRedirect.href : null);

  if (!redirectUrl) {
    const detail =
      (typeof rec.message === "string" && rec.message) ||
      (typeof rec.error === "string" && rec.error) ||
      `HTTP ${res.status}`;
    throw new Error(`Addi no devolvió URL de checkout: ${detail}`);
  }

  return { redirectUrl, raw: body ?? { location } };
}
