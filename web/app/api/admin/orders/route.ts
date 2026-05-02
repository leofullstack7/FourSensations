import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Pedidos de tienda pagados (fuente de verdad: checkout + webhooks ePayco/Bold).
 */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  if (!process.env.DATABASE_URL) {
    return noStoreJson({ orders: [] });
  }
  try {
    /** Cobro aprobado por pasarela; `status` puede quedar desalineado si hubo errores puntuales en actualizaciones. */
    const rows = await prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.APPROVED,
        status: { not: OrderStatus.CANCELLED },
      },
      include: { items: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return noStoreJson({
      orders: rows.map((o) => ({
        id: o.id,
        reference: o.reference,
        paymentProvider: o.paymentProvider,
        subtotal: o.subtotal,
        shipping: o.shipping,
        total: o.total,
        currency: o.currency,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        customerNote: o.customerNote,
        updatedAt: o.updatedAt.toISOString(),
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
      })),
    });
  } catch (e) {
    console.error("[GET /api/admin/orders]", e);
    return noStoreJson({ error: "Error al listar pedidos" }, { status: 500 });
  }
}
