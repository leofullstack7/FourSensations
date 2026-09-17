import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Estado público del pedido (para página resultado / polling). Sin datos sensibles extra. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const ref = decodeURIComponent(reference).trim();
  if (!ref) {
    return NextResponse.json({ error: "Falta referencia" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { reference: ref },
    include: {
      items: {
        select: {
          name: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          imageUrl: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    reference: order.reference,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    currency: order.currency,
    customerName: order.customerName,
    items: order.items,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  });
}
