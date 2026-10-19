import type { Prisma } from "@prisma/client";
import { orderPayloadForEmail } from "@/lib/server/email/order-notification";
import { sendTransactionalEmail } from "@/lib/server/email/send";
import { getWhatsAppDisplayNumber } from "@/lib/storefront-contact";
import {
  emailShell,
  escapeHtml,
  goldDivider,
  itemsTable,
  sectionTitle,
  softCard,
  statusPill,
  totalsBlock,
} from "@/lib/server/email/templates";

function extractShippingZoneId(shippingAddress: Prisma.JsonValue): string {
  try {
    const addr =
      typeof shippingAddress === "object" && shippingAddress !== null && !Array.isArray(shippingAddress)
        ? (shippingAddress as Record<string, unknown>)
        : {};
    return typeof addr.shippingZoneId === "string" ? addr.shippingZoneId.trim() : "";
  } catch {
    return "";
  }
}

export type CustomerOrderConfirmationInput = {
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  subtotal: number;
  shipping: number;
  shippingZoneLabel: string;
  shippingZoneId: string;
  shippingCarrierLabel?: string;
  paymentProvider: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress: string;
};

export function buildCustomerOrderConfirmationPayload(order: {
  reference: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: Prisma.JsonValue;
  paymentProvider: string | null;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
}): CustomerOrderConfirmationInput | null {
  if (!order.customerEmail?.trim()) return null;
  const base = orderPayloadForEmail(order);
  return {
    ...base,
    shippingZoneId: extractShippingZoneId(order.shippingAddress),
  };
}

export async function sendOrderConfirmationToCustomer(order: CustomerOrderConfirmationInput): Promise<void> {
  const to = order.customerEmail?.trim();
  if (!to) {
    console.warn("[email] correo del cliente vacío, omitiendo confirmación");
    return;
  }

  const whatsapp = getWhatsAppDisplayNumber();
  const whatsappEsc = escapeHtml(whatsapp);
  const firstName = order.customerName.trim().split(/\s+/)[0] || "belleza";
  const firstEsc = escapeHtml(firstName);
  const refEsc = escapeHtml(order.reference);
  const zoneEsc = escapeHtml(order.shippingZoneLabel);
  const carrierEsc = escapeHtml(order.shippingCarrierLabel || "Envía");
  const addrEsc = escapeHtml(order.shippingAddress);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "";
  const policiesHref = siteUrl ? `${siteUrl}/politicas-envio` : "#";
  const termsHref = siteUrl ? `${siteUrl}/terminos-condiciones` : "#";

  const shipNote =
    order.shipping === 0
      ? `Tu destino va por <strong style="color:#fff8f2;">${carrierEsc}</strong>. El flete se paga <strong style="color:#fff8f2;">contraentrega</strong>.`
      : `Transportadora: <strong style="color:#fff8f2;">${carrierEsc}</strong> · Zona: <strong style="color:#fff8f2;">${zoneEsc}</strong>.`;

  const bodyHtml = `
    <p style="margin:0 0 14px;font-size:18px;line-height:1.5;color:#fff8f2;">
      Hola, <em style="color:#f0c9d4;">${firstEsc}</em> —
    </p>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#e8d0da;">
      Tu pedido ya es parte de nuestra ritualística. Cada fórmula que elegiste se preparará con intención
      desde Manizales, para que tu cabello reciba exactamente lo que pediste.
    </p>
    <div style="text-align:center;margin:0 0 22px;">
      ${statusPill("Pago confirmado")}
      <p style="margin:12px 0 0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#d4af7a;">
        Referencia ${refEsc}
      </p>
    </div>

    ${sectionTitle("Tu ritual pedido")}
    <p style="margin:0 0 10px;font-size:13px;color:#c9a8b4;">Lo enviamos a: ${addrEsc}</p>
    ${itemsTable(order.items)}
    ${goldDivider()}
    ${totalsBlock({
      subtotal: order.subtotal,
      shipping: order.shipping,
      shippingLabel: `${order.shippingZoneLabel} · ${order.shippingCarrierLabel || "Envía"}`,
      total: order.total,
    })}

    ${sectionTitle("Cómo llega")}
    ${softCard(`
      <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#e8d0da;">
        Despachamos desde <strong style="color:#fff8f2;">Manizales, Caldas</strong>.
        Preparamos tu pedido en máximo <strong style="color:#fff8f2;">2 días hábiles</strong>
        (ese plazo no incluye el tránsito de la transportadora).
      </p>
      <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#e8d0da;">
        ${shipNote}
      </p>
      <p style="margin:0;font-size:14px;color:#d4af7a;">
        WhatsApp de atención: ${whatsappEsc}
      </p>
    `)}

    ${sectionTitle("Detalles que importan")}
    ${softCard(
      `
      <ul style="margin:0;padding-left:18px;color:#e8d0da;font-size:13px;line-height:1.75;">
        <li>Al recibir el paquete, revísalo y documenta cualquier novedad.</li>
        <li>Novedades de transporte (faltante, daño, guía “entregado” sin recepción): reporta en las <strong style="color:#fff8f2;">primeras 24 horas</strong> al WhatsApp ${whatsappEsc}, con fotos o video.</li>
        <li>No hay cambios comerciales por gusto. Sí aplica la garantía legal.</li>
        <li>Escríbenos a <a href="mailto:atencionalcliente.befs@gmail.com" style="color:#f0c9d4;">atencionalcliente.befs@gmail.com</a>.</li>
      </ul>
    `,
      "rgba(196,84,122,0.35)",
    )}

    <p style="margin:8px 0 0;text-align:center;">
      <a href="${policiesHref}" style="color:#d4af7a;font-size:13px;text-decoration:none;letter-spacing:0.08em;">Políticas de envío →</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="${termsHref}" style="color:#d4af7a;font-size:13px;text-decoration:none;letter-spacing:0.08em;">Términos →</a>
    </p>
    <p style="margin:22px 0 0;text-align:center;font-size:15px;font-style:italic;color:#f0c9d4;">
      Gracias por confiar en Four Sensations. Be you, be Four Sensations.
    </p>
  `;

  const html = emailShell({
    preheader: `Tu compra ${order.reference} está confirmada. Gracias por elegirnos.`,
    heroTitle: "Tu compra ya brilla con nosotras",
    heroSubtitle: "Confirmación de pedido",
    bodyHtml,
  });

  const result = await sendTransactionalEmail({
    to,
    subject: `✦ Tu compra en Four Sensations está confirmada — ${order.reference}`,
    html,
  });
  if (!result.ok) {
    console.error("[email] confirmación cliente falló:", result.error);
    throw new Error(`Email cliente falló: ${result.error}`);
  }
  console.log("[email] confirmación enviada al cliente vía", result.provider, to, order.reference);
}
