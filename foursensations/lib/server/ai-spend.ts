import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  AI_USAGE_KINDS,
  AI_USAGE_LABELS,
  AI_USAGE_PRICES_COP,
  type AiUsageKindKey,
} from "@/lib/ai-spend/pricing";
import { CatalogActions, CatalogEntities } from "@/lib/server/catalog-versioning";
import { recordCatalogVersionSafe } from "@/lib/server/record-catalog-version";

export type AiSpendKindSummary = {
  kind: AiUsageKindKey;
  label: string;
  unitPriceCop: number;
  count: number;
  totalCop: number;
};

export type AiSpendEventItem = {
  id: string;
  kind: AiUsageKindKey;
  label: string;
  amountCop: number;
  createdAt: string;
  note: string | null;
};

export type AiSpendSnapshot = {
  id: "ai-spend";
  adjustmentCop: number;
  eventsTotalCop: number;
  displayTotalCop: number;
};

async function ensureAiSpendMeta() {
  return prisma.aiSpendMeta.upsert({
    where: { id: 1 },
    create: { id: 1, adjustmentCop: 0 },
    update: {},
  });
}

export async function recordAiUsageEvent(opts: {
  kind: AiUsageKindKey;
  label?: string;
  note?: string | null;
  meta?: Record<string, unknown> | null;
  /** Override del monto (por defecto el precio fijo del kind). */
  amountCop?: number;
}): Promise<{ id: string; amountCop: number }> {
  const amountCop = opts.amountCop ?? AI_USAGE_PRICES_COP[opts.kind];
  const row = await prisma.aiUsageEvent.create({
    data: {
      kind: opts.kind,
      amountCop,
      label: (opts.label ?? AI_USAGE_LABELS[opts.kind]).slice(0, 200),
      note: opts.note?.slice(0, 500) ?? null,
      meta: opts.meta ? (opts.meta as Prisma.InputJsonValue) : undefined,
    },
  });
  return { id: row.id, amountCop: row.amountCop };
}

export async function getAiSpendSummary(): Promise<{
  displayTotalCop: number;
  eventsTotalCop: number;
  adjustmentCop: number;
  byKind: AiSpendKindSummary[];
}> {
  const meta = await ensureAiSpendMeta();
  const grouped = await prisma.aiUsageEvent.groupBy({
    by: ["kind"],
    _sum: { amountCop: true },
    _count: { _all: true },
  });

  const byKindMap = new Map(
    grouped.map((g) => [
      g.kind as AiUsageKindKey,
      {
        kind: g.kind as AiUsageKindKey,
        label: AI_USAGE_LABELS[g.kind as AiUsageKindKey],
        unitPriceCop: AI_USAGE_PRICES_COP[g.kind as AiUsageKindKey],
        count: g._count._all,
        totalCop: g._sum.amountCop ?? 0,
      } satisfies AiSpendKindSummary,
    ])
  );

  const byKind = AI_USAGE_KINDS.map(
    (kind) =>
      byKindMap.get(kind) ?? {
        kind,
        label: AI_USAGE_LABELS[kind],
        unitPriceCop: AI_USAGE_PRICES_COP[kind],
        count: 0,
        totalCop: 0,
      }
  );

  const eventsTotalCop = byKind.reduce((acc, k) => acc + k.totalCop, 0);
  const displayTotalCop = eventsTotalCop + meta.adjustmentCop;

  return {
    displayTotalCop,
    eventsTotalCop,
    adjustmentCop: meta.adjustmentCop,
    byKind,
  };
}

export async function listAiSpendEventsByKind(
  kind: AiUsageKindKey,
  limit = 100
): Promise<AiSpendEventItem[]> {
  const rows = await prisma.aiUsageEvent.findMany({
    where: { kind },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 300),
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as AiUsageKindKey,
    label: r.label || AI_USAGE_LABELS[r.kind as AiUsageKindKey],
    amountCop: r.amountCop,
    createdAt: r.createdAt.toISOString(),
    note: r.note,
  }));
}

export async function snapshotAiSpend(): Promise<AiSpendSnapshot> {
  const summary = await getAiSpendSummary();
  return {
    id: "ai-spend",
    adjustmentCop: summary.adjustmentCop,
    eventsTotalCop: summary.eventsTotalCop,
    displayTotalCop: summary.displayTotalCop,
  };
}

export async function applyAiSpendSnapshot(snap: AiSpendSnapshot): Promise<void> {
  await ensureAiSpendMeta();
  await prisma.aiSpendMeta.update({
    where: { id: 1 },
    data: { adjustmentCop: snap.adjustmentCop },
  });
}

/**
 * Fija el total mostrado a `targetTotalCop` ajustando `adjustmentCop`.
 * Registra versión en el historial de catálogo.
 */
export async function setAiSpendDisplayTotal(opts: {
  targetTotalCop: number;
  createdBy?: string | null;
}): Promise<{ displayTotalCop: number; adjustmentCop: number; versionNumber: number | null }> {
  const before = await snapshotAiSpend();
  const eventsTotalCop = before.eventsTotalCop;
  const adjustmentCop = opts.targetTotalCop - eventsTotalCop;

  await ensureAiSpendMeta();
  await prisma.aiSpendMeta.update({
    where: { id: 1 },
    data: { adjustmentCop },
  });

  const after = await snapshotAiSpend();

  const versionNumber = await recordCatalogVersionSafe({
    label: `Ajuste manual gasto IA: $${before.displayTotalCop.toLocaleString("es-CO")} → $${after.displayTotalCop.toLocaleString("es-CO")}`,
    summary: `Total mostrado de gasto en IA modificado manualmente (${before.displayTotalCop} → ${after.displayTotalCop} COP).`,
    createdBy: opts.createdBy,
    changes: [
      {
        entityType: CatalogEntities.AI_SPEND,
        entityId: "ai-spend",
        action: CatalogActions.UPDATE,
        label: "Gasto IA (contador dashboard)",
        beforeData: before,
        afterData: after,
      },
    ],
  });

  return {
    displayTotalCop: after.displayTotalCop,
    adjustmentCop: after.adjustmentCop,
    versionNumber,
  };
}
