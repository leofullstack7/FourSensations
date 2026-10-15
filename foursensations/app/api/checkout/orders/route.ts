import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildCustomerOrderConfirmationPayload, sendOrderConfirmationToCustomer } from "@/lib/server/email/order-confirmation-customer";
import { orderPayloadForEmail, sendOrderNotification } from "@/lib/server/email/order-notification";
import { createPendingOrderFromCheckout } from "@/lib/server/checkout/create-order";
import { prisma } from "@/lib/prisma";
import { createCheckoutOrderSchema } from "@/lib/validation/checkout-order";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createCheckoutOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validación", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const session = await auth();
  const userId =
    session?.user?.role === "CUSTOMER" && session.user.id ? session.user.id : null;

  const result = await createPendingOrderFromCheckout(parsed.data, { userId });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.paymentProvider === "CONTRAENTREGA") {
    const order = await prisma.order.findUnique({
      where: { id: result.orderId },
      include: { items: true },
    });
    if (order) {
      void sendOrderNotification(orderPayloadForEmail(order)).catch((err) =>
        console.error("[email] contraentrega admin", err),
      );
      const customerPayload = buildCustomerOrderConfirmationPayload(order);
      if (customerPayload) {
        void sendOrderConfirmationToCustomer(customerPayload).catch((err) =>
          console.error("[email] contraentrega cliente", err),
        );
      }
    }
  }

  return NextResponse.json({
    orderId: result.orderId,
    reference: result.reference,
    subtotal: result.subtotal,
    shipping: result.shipping,
    total: result.total,
    currency: result.currency,
  });
}
