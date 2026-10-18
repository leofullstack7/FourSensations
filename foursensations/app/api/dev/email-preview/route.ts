import { NextResponse } from "next/server";
import { sendOrderConfirmationToCustomer } from "@/lib/server/email/order-confirmation-customer";
import { sendOrderNotification } from "@/lib/server/email/order-notification";
import { describeEmailProvider } from "@/lib/server/email/send";

/**
 * Solo desarrollo: envía un correo de prueba (cliente + tienda) con datos ficticios.
 * POST /api/dev/email-preview  body opcional: { "to": "cualquier@correo.com" }
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  let toOverride: string | undefined;
  try {
    const body = (await req.json()) as { to?: string };
    if (typeof body.to === "string" && body.to.includes("@")) toOverride = body.to.trim();
  } catch {
    /* body vacío OK */
  }

  const provider = describeEmailProvider();
  if (provider.active === "none") {
    return NextResponse.json(
      {
        error: "Sin proveedor. Configura GMAIL_USER + GMAIL_APP_PASSWORD en .env.local",
        provider,
      },
      { status: 503 },
    );
  }

  const sample = {
    reference: `FS-PREVIEW-${Date.now().toString(36).toUpperCase()}`,
    customerName: "Juliana Prueba",
    customerEmail:
      toOverride ||
      process.env.GMAIL_USER?.trim() ||
      process.env.RESEND_NOTIFY_EMAIL?.trim() ||
      "pedidosfoursensations@gmail.com",
    customerPhone: "+57 304 363 2492",
    total: 73_900,
    subtotal: 58_000,
    shipping: 15_900,
    shippingZoneLabel: "Nacional",
    shippingCarrierLabel: "Envía",
    shippingZoneId: "nacional",
    paymentProvider: "MERCADOPAGO",
    items: [
      { productName: "Dulce Renacer", quantity: 1, unitPrice: 42_000 },
      { productName: "Shine Gloss", quantity: 1, unitPrice: 16_000 },
    ],
    shippingAddress: "Calle 65A #23A-15, Manizales, Caldas",
  };

  try {
    await sendOrderNotification(sample);
    await sendOrderConfirmationToCustomer(sample);
    return NextResponse.json({
      ok: true,
      reference: sample.reference,
      customerTo: sample.customerEmail,
      storeTo: process.env.RESEND_NOTIFY_EMAIL?.trim() || process.env.GMAIL_USER?.trim() || null,
      provider,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error enviando preview";
    return NextResponse.json({ error: msg, provider }, { status: 500 });
  }
}
