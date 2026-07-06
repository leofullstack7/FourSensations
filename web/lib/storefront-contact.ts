export const WHATSAPP_DEFAULT_MESSAGE =
  "Hola GinnaBeauty, quisiera conocer más sobre ...";

export function getWhatsAppHref(message = WHATSAPP_DEFAULT_MESSAGE): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
