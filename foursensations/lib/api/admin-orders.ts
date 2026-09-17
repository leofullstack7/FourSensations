import type { AdminSale } from "@/lib/types/admin";

type AdminOrderItemDto = {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type AdminOrderDto = {
  id: string;
  reference: string;
  paymentProvider: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerNote: string | null;
  updatedAt: string;
  createdAt: string;
  items: AdminOrderItemDto[];
};

function dtoToAdminSale(o: AdminOrderDto): AdminSale {
  const lines = o.items;
  const qtySum = lines.reduce((s, i) => s + i.quantity, 0);
  const first = lines[0];
  const productName =
    lines.length === 0
      ? "(Sin líneas)"
      : lines.length === 1
        ? first.name
        : `${first.name} + ${lines.length - 1} más`;
  const channel = (o.paymentProvider?.trim() || "Tienda web").toUpperCase();
  const t = new Date(o.updatedAt).getTime();
  return {
    id: `order-${o.id}`,
    source: "online",
    orderReference: o.reference,
    productId: first?.productId ?? null,
    productName,
    client: [o.customerName?.trim(), o.customerEmail?.trim()].filter(Boolean).join(" · ") || "Cliente",
    channel,
    qty: qtySum,
    total: o.total,
    status: "Completada",
    notes: [o.customerNote?.trim(), `Ref: ${o.reference}`].filter(Boolean).join(" · ") || `Ref: ${o.reference}`,
    date: new Date(o.updatedAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" }),
    createdAtMs: Number.isFinite(t) ? t : Date.now(),
  };
}

export async function fetchAdminPaidOrders(): Promise<AdminSale[]> {
  const res = await fetch("/api/admin/orders", { credentials: "include", cache: "no-store" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Error ${res.status} al cargar pedidos`);
  }
  const data = (await res.json()) as { orders?: AdminOrderDto[]; error?: string };
  if (data.error) throw new Error(data.error);
  const orders = data.orders ?? [];
  return orders.map(dtoToAdminSale);
}
