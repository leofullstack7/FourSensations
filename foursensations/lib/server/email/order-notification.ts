import { Resend } from "resend";
import type { Prisma } from "@prisma/client";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseShippingFromJson(shippingAddress: Prisma.JsonValue): {
  shippingZoneLabel: string;
  shippingAddressLine: string;
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
    const parts = [addr.line1, addr.line2, addr.city, addr.region, addr.postalCode]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
    return {
      shippingZoneLabel: label,
      shippingAddressLine: parts.length ? parts.join(", ") : "No especificada",
    };
  } catch {
    return { shippingZoneLabel: "No especificada", shippingAddressLine: "No especificada" };
  }
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
  paymentProvider: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.RESEND_NOTIFY_EMAIL?.trim();
  if (!apiKey || !to) {
    console.warn("[email] RESEND_API_KEY o RESEND_NOTIFY_EMAIL no configurados, omitiendo envío");
    return;
  }

  const resend = new Resend(apiKey);
  const zoneEsc = escapeHtml(order.shippingZoneLabel);
  const addrEsc = escapeHtml(order.shippingAddress);
  const nameEsc = escapeHtml(order.customerName);
  const emailEsc = escapeHtml(order.customerEmail);
  const phoneEsc = escapeHtml(order.customerPhone);
  const payEsc = escapeHtml(order.paymentProvider);
  const refEsc = escapeHtml(order.reference);

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f0e6f0;">${escapeHtml(item.productName)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f0e6f0; text-align:center;">${item.quantity}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f0e6f0; text-align:right;">$${item.unitPrice.toLocaleString("es-CO")} COP</td>
    </tr>
  `,
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Georgia, serif; background: #fdf6f9; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(180,80,120,0.10);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #c4547a, #e8a0b4); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 2px;">✨ Four Sensations</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Nueva compra aprobada</p>
        </div>

        <!-- Alert banner -->
        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 24px; margin: 24px 24px 0;">
          <p style="margin: 0; color: #15803d; font-weight: bold; font-size: 16px;">💰 ¡Nuevo pedido aprobado!</p>
          <p style="margin: 4px 0 0; color: #166534; font-size: 14px;">Referencia: <strong>${refEsc}</strong></p>
        </div>

        <div style="padding: 24px;">

          <!-- Cliente -->
          <h2 style="color: #c4547a; font-size: 16px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">👤 Datos del cliente</h2>
          <table style="width: 100%; border-collapse: collapse; background: #fdf6f9; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
            <tr><td style="padding: 8px 12px; color: #666; width: 40%;">Nombre</td><td style="padding: 8px 12px; font-weight: bold;">${nameEsc}</td></tr>
            <tr><td style="padding: 8px 12px; color: #666; background: #f9eef4;">Correo</td><td style="padding: 8px 12px; background: #f9eef4;">${emailEsc}</td></tr>
            <tr><td style="padding: 8px 12px; color: #666;">Teléfono</td><td style="padding: 8px 12px;">${phoneEsc}</td></tr>
            <tr><td style="padding: 8px 12px; color: #666; background: #f9eef4;">Dirección</td><td style="padding: 8px 12px; background: #f9eef4;">${addrEsc}</td></tr>
            <tr><td style="padding: 8px 12px; color: #666;">Zona envío</td><td style="padding: 8px 12px;">${zoneEsc}</td></tr>
            <tr><td style="padding: 8px 12px; color: #666; background: #f9eef4;">Método de pago</td><td style="padding: 8px 12px; background: #f9eef4;">${payEsc}</td></tr>
          </table>

          <!-- Productos -->
          <h2 style="color: #c4547a; font-size: 16px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">📦 Productos</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #c4547a; color: white;">
                <th style="padding: 10px 12px; text-align: left; font-weight: normal;">Producto</th>
                <th style="padding: 10px 12px; text-align: center; font-weight: normal;">Cant.</th>
                <th style="padding: 10px 12px; text-align: right; font-weight: normal;">Precio</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <!-- Totales -->
          <div style="background: #fdf6f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #666;">
              <span>Subtotal</span><span>$${order.subtotal.toLocaleString("es-CO")} COP</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #666;">
              <span>Envío (${zoneEsc})</span>
              <span>${order.shipping === 0 ? "$0 COP" : `$${order.shipping.toLocaleString("es-CO")} COP`}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; color: #c4547a; border-top: 2px solid #e8a0b4; padding-top: 12px;">
              <span>TOTAL</span><span>$${order.total.toLocaleString("es-CO")} COP</span>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div style="background: #f9eef4; padding: 20px; text-align: center;">
          <p style="margin: 0; color: #c4547a; font-size: 13px;">Four Sensations — atencionalcliente.befs@gmail.com</p>
          <p style="margin: 4px 0 0; color: #999; font-size: 12px;">Este correo fue generado automáticamente</p>
        </div>

      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject: `🛍️ Nueva compra aprobada — ${order.reference} — $${order.total.toLocaleString("es-CO")} COP`,
      html,
    });
    console.log("[email] notificación enviada para orden:", order.reference);
  } catch (error) {
    console.error("[email] error enviando notificación:", error);
  }
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
  const { shippingZoneLabel, shippingAddressLine } = parseShippingFromJson(order.shippingAddress);
  return {
    reference: order.reference,
    customerName: order.customerName?.trim() || "Cliente",
    customerEmail: order.customerEmail?.trim() || "",
    customerPhone: order.customerPhone?.trim() || "",
    total: order.total,
    subtotal: order.subtotal,
    shipping: order.shipping,
    shippingZoneLabel,
    paymentProvider: order.paymentProvider?.trim() || "EPAYCO",
    items: order.items.map((item) => ({
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    shippingAddress: shippingAddressLine,
  };
}
