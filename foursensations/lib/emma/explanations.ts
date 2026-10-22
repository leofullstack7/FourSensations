/** Copy aprobado «¿Por qué para mí?» (hoja Excel + overrides del pack). */

import type { EmmaAnswers, EmmaRoutineItem } from "@/lib/emma/flow";
import { defaultEmmaKnowledge, type EmmaKnowledgeBundle } from "@/lib/emma/knowledge";

const NEVER_CLAIMS: Record<string, string[]> = {
  Botanical: ["detox", "caspa", "grasa", "anticaspa"],
};

/** Preferir razón del motor; si falta, pack / copy aprobado. */
export function explainEmmaItem(
  item: EmmaRoutineItem,
  _answers?: EmmaAnswers,
  kb: EmmaKnowledgeBundle = defaultEmmaKnowledge(),
): string {
  const reason = item.reason?.trim();
  if (reason) return reason;
  return (
    kb.explanations[item.productKey]?.trim() ||
    `Elegí ${item.productKey} según lo que me contaste.`
  );
}

export function buildWhyForMeLines(
  items: EmmaRoutineItem[],
  answers?: EmmaAnswers,
  kb: EmmaKnowledgeBundle = defaultEmmaKnowledge(),
): { productKey: string; text: string }[] {
  return items.map((item) => ({
    productKey: item.productKey,
    text: explainEmmaItem(item, answers, kb),
  }));
}

export function assertNoForbiddenClaims(text: string, productKey: string): boolean {
  const never = NEVER_CLAIMS[productKey] ?? [];
  const lower = text.toLowerCase();
  return !never.some((w) => lower.includes(w));
}
