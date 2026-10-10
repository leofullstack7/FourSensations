import { WHOLESALE_THRESHOLD_COP } from "@/lib/admin/customer-crm";

export const WHOLESALE_REPEAT_THRESHOLD_COP = 300_000;
export const WHOLESALE_INACTIVITY_DAYS = 30;

export type WholesalePaidOrder = {
  total: number;
  createdAt: Date | string;
  paymentStatus?: string | null;
  status?: string | null;
};

export type WholesaleCycleStatus = {
  accumulatedSpend: number;
  minimumOrder: number;
  lastOrderAt: string | null;
  cycleReset: boolean;
  unlockedRepeatMinimum: boolean;
};

const MS_DAY = 24 * 60 * 60 * 1000;

function toDate(value: Date | string): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isPaidOrder(order: WholesalePaidOrder): boolean {
  const pay = (order.paymentStatus ?? "").toUpperCase();
  const status = (order.status ?? "").toUpperCase();
  return pay === "APPROVED" || status === "PAID";
}

export function resolveWholesaleCycle(orders: WholesalePaidOrder[], now = new Date()): WholesaleCycleStatus {
  const paid = orders
    .filter(isPaidOrder)
    .map((o) => ({ total: o.total, at: toDate(o.createdAt) }))
    .filter((o): o is { total: number; at: Date } => o.at != null)
    .sort((a, b) => b.at.getTime() - a.at.getTime());

  if (paid.length === 0) {
    return {
      accumulatedSpend: 0,
      minimumOrder: WHOLESALE_THRESHOLD_COP,
      lastOrderAt: null,
      cycleReset: false,
      unlockedRepeatMinimum: false,
    };
  }

  const last = paid[0]!;
  const inactiveMs = now.getTime() - last.at.getTime();
  if (inactiveMs > WHOLESALE_INACTIVITY_DAYS * MS_DAY) {
    return {
      accumulatedSpend: 0,
      minimumOrder: WHOLESALE_THRESHOLD_COP,
      lastOrderAt: last.at.toISOString(),
      cycleReset: true,
      unlockedRepeatMinimum: false,
    };
  }

  const cycle: { total: number; at: Date }[] = [];
  for (let i = 0; i < paid.length; i += 1) {
    const current = paid[i]!;
    if (i === 0) {
      cycle.push(current);
      continue;
    }
    const newer = paid[i - 1]!;
    if (newer.at.getTime() - current.at.getTime() > WHOLESALE_INACTIVITY_DAYS * MS_DAY) break;
    cycle.push(current);
  }

  const accumulatedSpend = cycle.reduce((sum, o) => sum + o.total, 0);
  const unlockedRepeatMinimum = cycle.some((o) => o.total >= WHOLESALE_THRESHOLD_COP);

  return {
    accumulatedSpend,
    minimumOrder: unlockedRepeatMinimum ? WHOLESALE_REPEAT_THRESHOLD_COP : WHOLESALE_THRESHOLD_COP,
    lastOrderAt: last.at.toISOString(),
    cycleReset: false,
    unlockedRepeatMinimum,
  };
}

export function wholesaleMinimumReminder(minimumOrder: number, cartSubtotal: number): string {
  const missing = Math.max(0, minimumOrder - cartSubtotal);
  if (missing <= 0) {
    return `Tu pedido mayorista ya supera el mínimo de ${minimumOrder.toLocaleString("es-CO")}.`;
  }
  return `Recuerda completar tu pedido: el mínimo mayorista es $${minimumOrder.toLocaleString("es-CO")}. Te faltan $${missing.toLocaleString("es-CO")} para poder pagar.`;
}
