import { NextResponse } from "next/server";
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

  const result = await createPendingOrderFromCheckout(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
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
