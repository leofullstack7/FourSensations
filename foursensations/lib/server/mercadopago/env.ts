function siteBase(): string | undefined {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return base || undefined;
}

export function getMercadoPagoAccessToken(): string | undefined {
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || undefined;
}

export function getMercadoPagoWebhookSecret(): string | undefined {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || undefined;
}

export function mercadoPagoBackUrl(reference: string): string {
  const base = siteBase();
  if (!base) {
    throw new Error("Define NEXT_PUBLIC_SITE_URL para las URLs de retorno de Mercado Pago.");
  }
  return `${base}/checkout/resultado?ref=${encodeURIComponent(reference)}`;
}

export function mercadoPagoNotificationUrl(): string {
  const explicit = process.env.MERCADOPAGO_NOTIFICATION_URL?.trim();
  if (explicit) return explicit;
  const base = siteBase();
  if (!base) {
    throw new Error("Define NEXT_PUBLIC_SITE_URL o MERCADOPAGO_NOTIFICATION_URL para el webhook de Mercado Pago.");
  }
  return `${base}/api/payments/mercadopago/webhook`;
}

export function assertMercadoPagoConfig(): { accessToken: string } {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  }
  return { accessToken };
}
