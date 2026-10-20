import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendOrderEmailsOnce } from "@/lib/server/email/order-email-once";
import { createPendingOrderFromCheckout } from "@/lib/server/checkout/create-order";
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

  // Solo contraentrega confirma aquí. Pasarelas: un único correo al aprobar el pago.
  if (result.paymentProvider === "CONTRAENTREGA") {
    void sendOrderEmailsOnce(result.orderId).catch((err) =>
      console.error("[email] contraentrega once", err),
    );
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
