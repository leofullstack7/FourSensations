import type { Prisma } from "@prisma/client";
import { sendTransactionalEmail } from "@/lib/server/email/send";
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

function parseShippingFromJson(shippingAddress: Prisma.JsonValue): {
  shippingZoneLabel: string;
  shippingAddressLine: string;
  shippingCarrierLabel: string;
} {
  try {
    const addr =
      typeof shippingAddress === "object" && shippingAddress !== null && !Array.isArray(shippingAddress)
        ? (shippingAddress as Record<string, unknown>)
        : {};
    const label =
      typeof addr.shippingZoneLabel === "string" && addr.shippingZoneLabel.trim()
        ? addr.shippingZoneLabel
        : "No especificada";
    const carrier =
      typeof addr.shippingCarrierLabel === "string" && addr.shippingCarrierLabel.trim()
        ? addr.shippingCarrierLabel
        : typeof addr.shippingCarrier === "string" && addr.shippingCarrier === "interrapidismo"
          ? "Interrapidísimo"
          : "Envía";
    const parts = [addr.line1, addr.line2, addr.city, addr.region, addr.postalCode]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
    return {
      shippingZoneLabel: label,
      shippingAddressLine: parts.length ? parts.join(", ") : "No especificada",
      shippingCarrierLabel: carrier,
    };
  } catch {
    return {
      shippingZoneLabel: "No especificada",
      shippingAddressLine: "No especificada",
      shippingCarrierLabel: "Envía",
    };
  }
}

function paymentLabel(provider: string): string {
  const p = provider.trim().toUpperCase();
  if (p === "MERCADOPAGO" || p === "MERCADO PAGO") return "Mercado Pago";
  if (p === "EPAYCO") return "ePayco";
  if (p === "BOLD") return "Bold";
  return provider || "Mercado Pago";
}

export async function sendOrderNotification(order: {
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  subtotal: number;
  shipping: number;
  shippingZoneLabel: string;
  shippingCarrierLabel?: string;
  paymentProvider: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress: string;
}): Promise<void> {
  const to = process.env.RESEND_NOTIFY_EMAIL?.trim() || process.env.GMAIL_USER?.trim();
  if (!to) {
    console.warn("[email] RESEND_NOTIFY_EMAIL / GMAIL_USER no configurados, omitiendo aviso a tienda");
    return;
  }

  const zoneEsc = escapeHtml(order.shippingZoneLabel);
  const carrierEsc = escapeHtml(order.shippingCarrierLabel || "Envía");
  const addrEsc = escapeHtml(order.shippingAddress);
  const nameEsc = escapeHtml(order.customerName);
  const emailEsc = escapeHtml(order.customerEmail);
  const phoneEsc = escapeHtml(order.customerPhone || "—");
  const payEsc = escapeHtml(paymentLabel(order.paymentProvider));
  const refEsc = escapeHtml(order.reference);

  const bodyHtml = `
    <div style="text-align:center;margin:0 0 22px;">
      ${statusPill("Pago aprobado · nuevo pedido")}
    </div>
    <p style="margin:0 0 8px;text-align:center;font-size:15px;line-height:1.6;color:#f0c9d4;">
      Acaba de entrar una compra real a la casa. Preparación desde Manizales.
    </p>
    <p style="margin:0 0 22px;text-align:center;font-size:13px;color:#d4af7a;letter-spacing:0.14em;text-transform:uppercase;">
      Ref. ${refEsc}
    </p>

    ${sectionTitle("Cliente")}
    ${softCard(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#c9a8b4;width:38%;">Nombre</td><td style="padding:6px 0;color:#fff8f2;font-weight:600;">${nameEsc}</td></tr>
        <tr><td style="padding:6px 0;color:#c9a8b4;">Correo</td><td style="padding:6px 0;color:#fff8f2;">${emailEsc}</td></tr>
        <tr><td style="padding:6px 0;color:#c9a8b4;">Teléfono</td><td style="padding:6px 0;color:#fff8f2;">${phoneEsc}</td></tr>
        <tr><td style="padding:6px 0;color:#c9a8b4;">Dirección</td><td style="padding:6px 0;color:#fff8f2;">${addrEsc}</td></tr>
        <tr><td style="padding:6px 0;color:#c9a8b4;">Zona</td><td style="padding:6px 0;color:#fff8f2;">${zoneEsc}</td></tr>
        <tr><td style="padding:6px 0;color:#c9a8b4;">Transportadora</td><td style="padding:6px 0;color:#fff8f2;">${carrierEsc}</td></tr>
        <tr><td style="padding:6px 0;color:#c9a8b4;">Pago</td><td style="padding:6px 0;color:#fff8f2;">${payEsc}</td></tr>
      </table>
    `)}

    ${sectionTitle("Productos")}
    ${itemsTable(order.items)}
    ${goldDivider()}
    ${totalsBlock({
      subtotal: order.subtotal,
      shipping: order.shipping,
      shippingLabel: `${order.shippingZoneLabel} · ${order.shippingCarrierLabel || "Envía"}`,
      total: order.total,
    })}
  `;

  const html = emailShell({
    preheader: `Nueva compra ${order.reference} — $${order.total.toLocaleString("es-CO")} COP`,
    heroTitle: "Una nueva sensación acaba de pedirse",
    heroSubtitle: "Aviso interno · pedidos",
    bodyHtml,
    footerNote: "Four Sensations — pedidosfoursensations@gmail.com · aviso automático de pago aprobado",
  });

  const result = await sendTransactionalEmail({
    to,
    subject: `✦ Nueva compra — ${order.reference} — $${order.total.toLocaleString("es-CO")} COP`,
    html,
  });
  if (!result.ok) {
    console.error("[email] notificación tienda falló:", result.error);
    return;
  }
  console.log("[email] notificación enviada a tienda vía", result.provider, to, order.reference);
}

export function orderPayloadForEmail(order: {
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
}): Parameters<typeof sendOrderNotification>[0] {
  const { shippingZoneLabel, shippingAddressLine, shippingCarrierLabel } = parseShippingFromJson(
    order.shippingAddress,
  );
  return {
    reference: order.reference,
    customerName: order.customerName?.trim() || "Cliente",
    customerEmail: order.customerEmail?.trim() || "",
    customerPhone: order.customerPhone?.trim() || "",
    total: order.total,
    subtotal: order.subtotal,
    shipping: order.shipping,
    shippingZoneLabel,
    shippingCarrierLabel,
    paymentProvider: order.paymentProvider?.trim() || "MERCADOPAGO",
    items: order.items.map((item) => ({
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    shippingAddress: shippingAddressLine,
  };
}
