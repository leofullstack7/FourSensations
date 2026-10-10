const MP_API = "https://api.mercadopago.com";

export type MercadoPagoPreferenceResult = {
  id: string;
  initPoint: string;
  sandboxInitPoint?: string;
};

export type MercadoPagoPayment = {
  id: number;
  status: string;
  status_detail?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string | null;
  metadata?: Record<string, unknown> | null;
};

async function mpFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && json !== null && "message" in json
        ? String((json as { message?: unknown }).message)
        : text.slice(0, 400);
    throw new Error(msg || `Mercado Pago HTTP ${res.status}`);
  }
  return json as T;
}

export async function createMercadoPagoPreference(opts: {
  accessToken: string;
  title: string;
  amount: number;
  reference: string;
  orderId: string;
  email: string;
  name: string;
  backUrl: string;
  notificationUrl: string;
}): Promise<MercadoPagoPreferenceResult> {
  const body = {
    items: [
      {
        id: opts.reference,
        title: opts.title.slice(0, 120),
        quantity: 1,
        unit_price: opts.amount,
        currency_id: "COP",
      },
    ],
    payer: {
      email: opts.email,
      name: opts.name,
    },
    external_reference: opts.reference,
    metadata: {
      orderId: opts.orderId,
      reference: opts.reference,
    },
    back_urls: {
      success: opts.backUrl,
      failure: opts.backUrl,
      pending: opts.backUrl,
    },
    auto_return: "approved",
    notification_url: opts.notificationUrl,
    statement_descriptor: "FOURSENSATIONS",
  };

  const json = await mpFetch<{
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
  }>(opts.accessToken, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const initPoint = json.init_point || json.sandbox_init_point;
  if (!json.id || !initPoint) {
    throw new Error("Mercado Pago no devolvió init_point");
  }

  return {
    id: json.id,
    initPoint,
    sandboxInitPoint: json.sandbox_init_point,
  };
}

export async function fetchMercadoPagoPayment(
  accessToken: string,
  paymentId: string,
): Promise<MercadoPagoPayment> {
  return mpFetch<MercadoPagoPayment>(accessToken, `/v1/payments/${encodeURIComponent(paymentId)}`);
}
