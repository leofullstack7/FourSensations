import { NextResponse } from "next/server";
import { sendOrderConfirmationToCustomer } from "@/lib/server/email/order-confirmation-customer";
import { sendOrderNotification } from "@/lib/server/email/order-notification";
import { describeEmailProvider, resolveStoreNotifyEmail } from "@/lib/server/email/send";
import { requireAdminApi } from "@/lib/server/require-admin-api";

/**
 * Envía un correo de prueba (cliente + tienda).
 * - Dev: libre
 * - Prod: solo admin autenticado (para validar Brevo en Render)
 * POST body opcional: { "to": "cualquier@correo.com" }
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const denied = await requireAdminApi();
    if (denied) return denied;
  }

  let toOverride: string | undefined;
  try {
    const body = (await req.json()) as { to?: string };
    if (typeof body.to === "string" && body.to.includes("@")) toOverride = body.to.trim();
  } catch {
    /* body vacío OK */
  }

  const provider = await describeEmailProvider();
  if (provider.active === "none") {
    return NextResponse.json(
      {
        error: "Sin proveedor. En Render agrega BREVO_API_KEY + EMAIL_FROM + RESEND_NOTIFY_EMAIL.",
        provider,
      },
      { status: 503 },
    );
  }

  const notify = await resolveStoreNotifyEmail();
  const sample = {
    reference: `FS-PREVIEW-${Date.now().toString(36).toUpperCase()}`,
    customerName: "Juliana Prueba",
    customerEmail: toOverride || notify || "pedidosfoursensations@gmail.com",
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
      storeTo: notify,
      provider,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error enviando preview";
    return NextResponse.json({ error: msg, provider }, { status: 500 });
  }
}
