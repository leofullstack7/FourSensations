import type { AdminSale } from "@/lib/types/admin";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;

export type SemesterSalesMonth = {
  label: string;
  monthIndex: number;
  total: number;
};

export type SemesterSalesChart = {
  year: number;
  title: string;
  months: SemesterSalesMonth[];
};

function parseSaleDate(sale: AdminSale): Date | null {
  if (sale.createdAtMs != null && Number.isFinite(sale.createdAtMs)) {
    return new Date(sale.createdAtMs);
  }

  const raw = sale.date?.trim();
  if (!raw) return null;

  const iso = Date.parse(raw);
  if (Number.isFinite(iso)) return new Date(iso);

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (match) {
    const day = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10) - 1;
    let year = Number.parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const parsed = new Date(year, month, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function isCountedSale(sale: AdminSale): boolean {
  return sale.status !== "Pendiente";
}

/** Semestre calendario: ene–jun si el mes actual es ene–jun; jul–dic si es jul–dic. */
export function getSemesterMonthIndices(referenceMonth: number): number[] {
  return referenceMonth < 6 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];
}

export function computeSemesterSalesChart(
  sales: AdminSale[],
  now: Date = new Date()
): SemesterSalesChart {
  const year = now.getFullYear();
  const monthIndices = getSemesterMonthIndices(now.getMonth());
  const totals = new Map<number, number>();

  for (const idx of monthIndices) {
    totals.set(idx, 0);
  }

  for (const sale of sales) {
    if (!isCountedSale(sale)) continue;

    const when = parseSaleDate(sale);
    if (!when) continue;
    if (when.getFullYear() !== year) continue;

    const month = when.getMonth();
    if (!totals.has(month)) continue;

    totals.set(month, (totals.get(month) ?? 0) + (Number(sale.total) || 0));
  }

  const startLabel = MONTH_LABELS[monthIndices[0]];
  const endLabel = MONTH_LABELS[monthIndices[5]];

  return {
    year,
    title: `Ventas ${startLabel}–${endLabel} ${year}`,
    months: monthIndices.map((monthIndex) => ({
      label: MONTH_LABELS[monthIndex],
      monthIndex,
      total: totals.get(monthIndex) ?? 0,
    })),
  };
}

export function compactChartAmount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}
