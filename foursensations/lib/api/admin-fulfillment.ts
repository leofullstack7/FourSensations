import { adminFetch } from "@/lib/api/admin-fetch";
import type { AdminFulfillmentOrder } from "@/lib/types/admin-fulfillment";
import { clampFulfillmentStage } from "@/lib/fulfillment-kanban";

export async function fetchAdminFulfillmentOrders(): Promise<AdminFulfillmentOrder[]> {
  const res = await adminFetch("/api/admin/orders", { credentials: "include", cache: "no-store" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Error ${res.status} al cargar pedidos`);
  }
  const data = (await res.json()) as { orders?: AdminFulfillmentOrder[]; error?: string };
  if (data.error) throw new Error(data.error);
  return (data.orders ?? []).map((o) => ({
    ...o,
    fulfillmentStage: clampFulfillmentStage(o.fulfillmentStage),
    items: (o.items ?? []).map((i) => ({
      ...i,
      imageUrl: i.imageUrl ?? null,
    })),
  }));
}

export async function patchAdminOrderFulfillmentStage(
  orderId: string,
  stage: number,
): Promise<{ id: string; fulfillmentStage: number; fulfillmentStageAt: string }> {
  const res = await adminFetch(`/api/admin/orders/${encodeURIComponent(orderId)}/fulfillment`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ stage }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    id?: string;
    fulfillmentStage?: number;
    fulfillmentStageAt?: string;
  };
  if (!res.ok) throw new Error(data.error || "No se pudo mover el pedido");
  return {
    id: data.id || orderId,
    fulfillmentStage: clampFulfillmentStage(data.fulfillmentStage),
    fulfillmentStageAt: data.fulfillmentStageAt || new Date().toISOString(),
  };
}
