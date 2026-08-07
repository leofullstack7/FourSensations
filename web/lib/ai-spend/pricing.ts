/** Precios fijos (COP) por uso de funciones “IA” / automatización en GinnaBeauty. */

export const AI_USAGE_KINDS = [
  "CHAT",
  "PRODUCT_DESCRIPTION",
  "COMBINE_SUGGEST",
  "IMAGE_OPTIMIZE",
] as const;

export type AiUsageKindKey = (typeof AI_USAGE_KINDS)[number];

export const AI_USAGE_PRICES_COP: Record<AiUsageKindKey, number> = {
  CHAT: 500,
  PRODUCT_DESCRIPTION: 300,
  COMBINE_SUGGEST: 1000,
  IMAGE_OPTIMIZE: 200,
};

export const AI_USAGE_LABELS: Record<AiUsageKindKey, string> = {
  CHAT: "Chat Ginna AI",
  PRODUCT_DESCRIPTION: "Descripción de producto con IA",
  COMBINE_SUGGEST: "Combinar productos con IA",
  IMAGE_OPTIMIZE: "Optimizar peso de imágenes",
};

export const AI_SPEND_OVERRIDE_PASSWORD = "2025Ginnaai";

export function isAiUsageKind(value: string): value is AiUsageKindKey {
  return (AI_USAGE_KINDS as readonly string[]).includes(value);
}
