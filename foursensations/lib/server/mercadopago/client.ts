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

function splitPayerName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "Cliente", surname: "Four" };
  if (parts.length === 1) return { name: parts[0]!, surname: "Four" };
  return { name: parts[0]!, surname: parts.slice(1).join(" ") };
}

function normalizePhone(phone?: string | null): { area_code: string; number: string } | undefined {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  // Celular CO: 10 dígitos (3XX…) o 12 con 57.
  const local = digits.startsWith("57") && digits.length >= 12 ? digits.slice(-10) : digits.slice(-10);
  return { area_code: "57", number: local };
}

export async function createMercadoPagoPreference(opts: {
  accessToken: string;
  title: string;
  amount: number;
  reference: string;
  orderId: string;
  email: string;
  name: string;
  phone?: string | null;
  documentNumber?: string | null;
  backUrl: string;
  notificationUrl: string;
}): Promise<MercadoPagoPreferenceResult> {
  const amount = Math.round(Number(opts.amount));
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error("Monto inválido para Mercado Pago");
  }

  const { name, surname } = splitPayerName(opts.name);
  const phone = normalizePhone(opts.phone);
  const documentNumber = (opts.documentNumber ?? "").replace(/\D/g, "");
  // Máx. 13 caracteres en el extracto de tarjeta.
  const statementDescriptor = "FOURSENSATION";

  const body: Record<string, unknown> = {
    items: [
      {
        id: opts.reference.slice(0, 60),
        title: opts.title.slice(0, 120),
        description: `Pedido ${opts.reference}`.slice(0, 200),
        category_id: "others",
        quantity: 1,
        unit_price: amount,
        currency_id: "COP",
      },
    ],
    payer: {
      email: opts.email.trim().toLowerCase(),
      name,
      surname,
      ...(phone ? { phone } : {}),
      ...(documentNumber.length >= 5
        ? { identification: { type: "CC", number: documentNumber } }
        : {}),
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
    statement_descriptor: statementDescriptor,
    binary_mode: false,
    payment_methods: {
      installments: 12,
    },
  };

  const json = await mpFetch<{
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
  }>(opts.accessToken, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const token = opts.accessToken.trim();
  const preferSandbox = /^TEST-/i.test(token);
  const initPoint = preferSandbox
    ? json.sandbox_init_point || json.init_point
    : json.init_point || json.sandbox_init_point;
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
