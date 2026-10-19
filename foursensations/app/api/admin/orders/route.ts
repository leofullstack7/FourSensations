import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { ensureStoreSchemaExtras } from "@/lib/server/ensure-schema";
import { clampFulfillmentStage } from "@/lib/fulfillment-kanban";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Pedidos de tienda pagados (fuente de verdad: checkout + webhooks).
 * Incluye fase Kanban de envío y dirección completa.
 */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  if (!process.env.DATABASE_URL) {
    return noStoreJson({ orders: [] });
  }
  try {
    await ensureStoreSchemaExtras();
    const rows = await prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.APPROVED,
        status: { not: OrderStatus.CANCELLED },
      },
      include: { items: true },
      orderBy: { updatedAt: "desc" },
      take: 800,
    });
    return noStoreJson({
      orders: rows.map((o) => {
        const stage = clampFulfillmentStage(
          (o as { fulfillmentStage?: number }).fulfillmentStage ?? 1,
        );
        const stageAt =
          (o as { fulfillmentStageAt?: Date }).fulfillmentStageAt ?? o.createdAt;
        return {
          id: o.id,
          reference: o.reference,
          paymentProvider: o.paymentProvider,
          paymentStatus: o.paymentStatus,
          status: o.status,
          subtotal: o.subtotal,
          shipping: o.shipping,
          discount: o.discount,
          total: o.total,
          currency: o.currency,
          couponCode: o.couponCode,
          customerName: o.customerName,
          customerEmail: o.customerEmail,
          customerPhone: o.customerPhone,
          customerNote: o.customerNote,
          shippingAddress:
            o.shippingAddress && typeof o.shippingAddress === "object"
              ? (o.shippingAddress as Record<string, unknown>)
              : null,
          fulfillmentStage: stage,
          fulfillmentStageAt: stageAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
          createdAt: o.createdAt.toISOString(),
          items: o.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            imageUrl: i.imageUrl,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
          })),
        };
      }),
    });
  } catch (e) {
    console.error("[GET /api/admin/orders]", e);
    return noStoreJson({ error: "Error al listar pedidos" }, { status: 500 });
  }
}
