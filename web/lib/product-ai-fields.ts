import type { AdminProduct } from "@/lib/types/admin";

export const AI_COMPLETABLE_FIELDS = ["description", "tags", "emoji", "badge"] as const;

export type AiCompletableField = (typeof AI_COMPLETABLE_FIELDS)[number];

export type AiGeneratedFieldsMap = Partial<Record<AiCompletableField, boolean>>;

export const AI_FIELD_LABELS: Record<AiCompletableField, string> = {
  description: "Descripción",
  tags: "Etiquetas",
  emoji: "Emoji",
  badge: "Badge",
};

const DEFAULT_EMOJI = "📦";

export function parseAiGeneratedFields(raw: unknown): AiGeneratedFieldsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: AiGeneratedFieldsMap = {};
  for (const key of AI_COMPLETABLE_FIELDS) {
    if ((raw as Record<string, unknown>)[key] === true) out[key] = true;
  }
  return out;
}

export function isFieldEmptyForAi(product: Pick<AdminProduct, AiCompletableField>, field: AiCompletableField): boolean {
  switch (field) {
    case "description":
      return !product.description?.trim() || product.description.trim().length < 12;
    case "tags":
      return !product.tags?.length;
    case "emoji":
      return !product.emoji?.trim() || product.emoji.trim() === DEFAULT_EMOJI;
    case "badge":
      return product.badge == null || product.badge === "";
    default:
      return true;
  }
}

export function getEmptyAiFields(product: Pick<AdminProduct, AiCompletableField>): AiCompletableField[] {
  return AI_COMPLETABLE_FIELDS.filter((f) => isFieldEmptyForAi(product, f));
}

export function productNeedsAiComplete(product: Pick<AdminProduct, AiCompletableField>): boolean {
  return getEmptyAiFields(product).length > 0;
}

export function isAiGeneratedField(product: Pick<AdminProduct, "aiGeneratedFields">, field: AiCompletableField): boolean {
  return parseAiGeneratedFields(product.aiGeneratedFields)[field] === true;
}

/** Celda de lista: Sí = generado por IA, No = tiene valor manual, — = vacío */
export function aiFieldListCell(
  product: Pick<AdminProduct, AiCompletableField | "aiGeneratedFields">,
  field: AiCompletableField,
): "si" | "no" | "empty" {
  if (isAiGeneratedField(product, field)) return "si";
  if (!isFieldEmptyForAi(product, field)) return "no";
  return "empty";
}

export function mergeAiGeneratedFields(
  existing: unknown,
  filled: AiCompletableField[],
): AiGeneratedFieldsMap | null {
  const base = parseAiGeneratedFields(existing);
  for (const f of filled) base[f] = true;
  return Object.keys(base).length > 0 ? base : null;
}

export function clearAiFieldValue(field: AiCompletableField): Partial<AdminProduct> {
  switch (field) {
    case "description":
      return { description: "" };
    case "tags":
      return { tags: [] };
    case "emoji":
      return { emoji: DEFAULT_EMOJI };
    case "badge":
      return { badge: null };
    default:
      return {};
  }
}

export function stripAiFlagsForManualEdit(
  existing: unknown,
  patchKeys: string[],
): AiGeneratedFieldsMap | null {
  const base = { ...parseAiGeneratedFields(existing) };
  for (const key of patchKeys) {
    if ((AI_COMPLETABLE_FIELDS as readonly string[]).includes(key)) {
      delete base[key as AiCompletableField];
    }
  }
  return Object.keys(base).length > 0 ? base : null;
}
