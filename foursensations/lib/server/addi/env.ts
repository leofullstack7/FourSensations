function siteBase(): string | undefined {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return base || undefined;
}

export function isAddiSandbox(): boolean {
  return process.env.ADDI_SANDBOX?.trim().toLowerCase() === "true";
}

export function getAddiClientId(): string | undefined {
  return process.env.ADDI_CLIENT_ID?.trim() || undefined;
}

export function getAddiClientSecret(): string | undefined {
  return process.env.ADDI_CLIENT_SECRET?.trim() || undefined;
}

export function getAddiAllySlug(): string | undefined {
  return process.env.ADDI_ALLY_SLUG?.trim() || undefined;
}

export function addiAuthUrl(): string {
  return isAddiSandbox() ? "https://auth.addi-staging.com" : "https://auth.addi.com";
}

export function addiApiBaseUrl(): string {
  return isAddiSandbox() ? "https://api.addi-staging.com" : "https://api.addi.com";
}

export function addiAudience(): string {
  return "https://api.addi.com";
}

export function addiCallbackUrl(): string {
  const explicit = process.env.ADDI_WEBHOOK_URL?.trim();
  if (explicit) return explicit;
  const base = siteBase();
  if (!base) throw new Error("Define NEXT_PUBLIC_SITE_URL o ADDI_WEBHOOK_URL para el webhook de Addi.");
  return `${base}/api/payments/addi/webhook`;
}

export function addiRedirectionUrl(reference: string): string {
  const base = siteBase();
  if (!base) throw new Error("Define NEXT_PUBLIC_SITE_URL para el retorno de Addi.");
  return `${base}/checkout/resultado?ref=${encodeURIComponent(reference)}&provider=addi`;
}

export function addiLogoUrl(): string {
  const explicit = process.env.ADDI_LOGO_URL?.trim();
  if (explicit) return explicit;
  const base = siteBase();
  return base ? `${base}/icon.png` : "https://foursensations.onrender.com/icon.png";
}

export function assertAddiConfig(): { clientId: string; clientSecret: string } {
  const clientId = getAddiClientId();
  const clientSecret = getAddiClientSecret();
  if (!clientId || !clientSecret) {
    throw new Error("Faltan ADDI_CLIENT_ID o ADDI_CLIENT_SECRET");
  }
  return { clientId, clientSecret };
}
