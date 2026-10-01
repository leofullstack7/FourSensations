/** WhatsApp del negocio (dígitos con código país 57). Fuente canónica. */
export const WHATSAPP_BUSINESS_DIGITS = "573043632492";

/** Formato legible para mostrar al cliente. */
export const WHATSAPP_BUSINESS_DISPLAY = "+57 304 363 2492";

/** Placeholder histórico; si sigue en env, se ignora a favor del número canónico. */
const WHATSAPP_PLACEHOLDER_DIGITS = "573001234567";

/** FAB sticky / burbuja principal. */
export const WHATSAPP_DEFAULT_MESSAGE =
  "Holaaa Four Sensations 💗 Vi tantas cositas que ya no sé cuál elegir jajaja 💗 ¿Me ayudan a encontrar mi rutina ideal? ✨";

/** Link “WhatsApp de atención” en footer Ayuda. */
export const WHATSAPP_SUPPORT_MESSAGE =
  "Holaaa Four Sensations 💗 Vi varias cositas que me encantaron y quiero comprar. ¿Me ayudan con mi pedido? ✨";

export function getWhatsAppDigits(): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  const digits = raw?.replace(/\D/g, "") || "";
  if (digits && digits !== WHATSAPP_PLACEHOLDER_DIGITS) return digits;
  return WHATSAPP_BUSINESS_DIGITS;
}

export function getWhatsAppDisplayNumber(): string {
  const digits = getWhatsAppDigits();
  if (digits === WHATSAPP_BUSINESS_DIGITS) return WHATSAPP_BUSINESS_DISPLAY;
  if (digits.startsWith("57") && digits.length === 12) {
    const local = digits.slice(2);
    return `+57 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return digits.startsWith("57") ? `+${digits}` : `+57 ${digits}`;
}

export function getWhatsAppHref(message = WHATSAPP_DEFAULT_MESSAGE): string {
  return `https://wa.me/${getWhatsAppDigits()}?text=${encodeURIComponent(message)}`;
}
