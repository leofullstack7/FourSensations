import { NextResponse } from "next/server";
import { z } from "zod";
import { applyMercadoPagoPayment } from "@/lib/server/mercadopago/apply-confirmation";
import { fetchMercadoPagoPayment } from "@/lib/server/mercadopago/client";
import { assertMercadoPagoConfig } from "@/lib/server/mercadopago/env";

const bodySchema = z.object({
  paymentId: z.string().min(1).optional(),
  collectionId: z.string().min(1).optional(),
  reference: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validación" }, { status: 400 });
  }

  const paymentId = parsed.data.paymentId || parsed.data.collectionId;
  if (!paymentId) {
    return NextResponse.json({ linked: false, reference: parsed.data.reference ?? null });
  }

  try {
    const { accessToken } = assertMercadoPagoConfig();
    const payment = await fetchMercadoPagoPayment(accessToken, paymentId);
    const result = await applyMercadoPagoPayment(payment);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({
      linked: Boolean(result.orderReference),
      reference: result.orderReference ?? parsed.data.reference ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error sync Mercado Pago";
    console.error("[mercadopago] sync", msg);
    return NextResponse.json({ linked: false, error: msg }, { status: 200 });
  }
}
