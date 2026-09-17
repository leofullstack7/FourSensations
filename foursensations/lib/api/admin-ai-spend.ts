import type { AiUsageKindKey } from "@/lib/ai-spend/pricing";

export type AiSpendKindSummary = {
  kind: AiUsageKindKey;
  label: string;
  unitPriceCop: number;
  count: number;
  totalCop: number;
};

export type AiSpendSummary = {
  displayTotalCop: number;
  eventsTotalCop: number;
  adjustmentCop: number;
  byKind: AiSpendKindSummary[];
};

export type AiSpendEventItem = {
  id: string;
  kind: AiUsageKindKey;
  label: string;
  amountCop: number;
  createdAt: string;
  note: string | null;
};

export async function fetchAdminAiSpendSummary(): Promise<AiSpendSummary> {
  const res = await fetch("/api/admin/ai-spend", { cache: "no-store" });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "No se pudo cargar el gasto IA");
  }
  return (await res.json()) as AiSpendSummary;
}

export async function fetchAdminAiSpendEvents(kind: AiUsageKindKey): Promise<AiSpendEventItem[]> {
  const res = await fetch(`/api/admin/ai-spend?kind=${encodeURIComponent(kind)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "No se pudieron cargar los eventos");
  }
  const data = (await res.json()) as { events: AiSpendEventItem[] };
  return data.events;
}

export async function patchAdminAiSpendTotal(opts: {
  password: string;
  targetTotalCop: number;
}): Promise<AiSpendSummary & { versionNumber: number | null }> {
  const res = await fetch("/api/admin/ai-spend", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "No se pudo actualizar el total");
  }
  return (await res.json()) as AiSpendSummary & { versionNumber: number | null };
}

export async function postAdminAiSpendRecord(opts: {
  kind: "IMAGE_OPTIMIZE" | "COMBINE_SUGGEST";
  note?: string;
  label?: string;
}): Promise<void> {
  const res = await fetch("/api/admin/ai-spend/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "No se pudo registrar el gasto");
  }
}
