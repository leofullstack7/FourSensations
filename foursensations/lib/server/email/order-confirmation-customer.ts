import { Resend } from "resend";
import type { Prisma } from "@prisma/client";
import { orderPayloadForEmail } from "@/lib/server/email/order-notification";
import { getWhatsAppDisplayNumber } from "@/lib/storefront-contact";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function whatsappDisplayNumber(): string {
  return getWhatsAppDisplayNumber();
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

function deliveryBlockHtml(_zoneId: string, _customerPhoneEsc: string, whatsappEsc: string): string {
  return `
          <div style="background: #fdf6f9; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #f0e6f0;">
            <h2 style="color: #8a5fb0; font-size: 16px; margin: 0 0 12px;">📦 Tu envío</h2>
            <p style="margin: 0 0 10px; color: #444; line-height: 1.65; font-size: 14px;">
              Despachamos desde <strong>Manizales, Caldas</strong>. Preparamos y enviamos tu pedido en máximo
              <strong>2 días hábiles</strong> desde la confirmación (este plazo no incluye el tránsito de la transportadora).
            </p>
            <p style="margin: 0 0 10px; color: #444; line-height: 1.65; font-size: 14px;">
              Transportadora principal: <strong>Envía</strong>. En municipios con reexpedición: <strong>Interrapidísimo</strong>.
              No comprometemos una fecha exacta de entrega porque depende de la transportadora.
            </p>
            <p style="margin: 0; color: #8a5fb0; font-size: 14px; font-weight: 600;">WhatsApp de atención: ${whatsappEsc}</p>
          </div>`;
}

export async function sendOrderConfirmationToCustomer(order: CustomerOrderConfirmationInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = order.customerEmail?.trim();
  if (!apiKey || !to) {
    console.warn("[email] RESEND_API_KEY o correo del cliente vacío, omitiendo confirmación al cliente");
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const resend = new Resend(apiKey);
  const whatsapp = whatsappDisplayNumber();
  const whatsappEsc = escapeHtml(whatsapp);

  const firstName =
    order.customerName
      .trim()
      .split(/\s+/)[0] || "Cliente";
  const firstEsc = escapeHtml(firstName);
  const refEsc = escapeHtml(order.reference);
  const zoneEsc = escapeHtml(order.shippingZoneLabel);
  const addrEsc = escapeHtml(order.shippingAddress);
  const phoneEsc = escapeHtml(order.customerPhone);

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

  const deliveryHtml = deliveryBlockHtml(order.shippingZoneId, phoneEsc, whatsappEsc);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Georgia, 'Times New Roman', serif; background: #fdf6f9; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #fffef9; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(180,80,120,0.12);">
        <div style="background: linear-gradient(135deg, #c4547a, #e8a0b4); padding: 36px 28px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 30px; letter-spacing: 2px; font-weight: 600;">✨ Four Sensations</h1>
          <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 15px; letter-spacing: 0.5px;">Tu pedido está confirmado</p>
        </div>

        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 16px; font-size: 17px; color: #3d2c2a; line-height: 1.6;">
            ¡Hola, <strong>${firstEsc}</strong>! 💕
          </p>
          <p style="margin: 0 0 14px; color: #5c4f4d; line-height: 1.75; font-size: 15px;">
            Queremos que sepas que tu pedido significa mucho para nosotras.<br/>
            Cada producto que elegiste fue preparado con amor y cuidado especial para ti.<br/>
            Estamos emocionadas de que pronto tengas tus productos favoritos en tus manos.
          </p>
          <p style="margin: 0 0 24px; color: #c4547a; font-size: 15px; font-weight: 600;">
            ¡Gracias por confiar en Four Sensations! 🌸
          </p>

          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <p style="margin: 0; color: #15803d; font-weight: bold; font-size: 15px;">✅ Pago aprobado</p>
            <p style="margin: 6px 0 0; color: #166534; font-size: 14px;">Referencia: <strong>${refEsc}</strong></p>
          </div>

          <h2 style="color: #c4547a; font-size: 16px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">📦 Resumen del pedido</h2>
          <p style="margin: 0 0 8px; font-size: 13px; color: #666;">Enviaremos a: ${addrEsc}</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #c4547a; color: white;">
                <th style="padding: 10px 12px; text-align: left; font-weight: normal;">Producto</th>
                <th style="padding: 10px 12px; text-align: center; font-weight: normal;">Cant.</th>
                <th style="padding: 10px 12px; text-align: right; font-weight: normal;">Precio</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="background: #fdf6f9; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #666; font-size: 14px;">
              <span>Subtotal</span><span>$${order.subtotal.toLocaleString("es-CO")} COP</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; color: #666; font-size: 14px;">
              <span>Envío (${zoneEsc})</span>
              <span>${order.shipping === 0 ? "$0 COP" : `$${order.shipping.toLocaleString("es-CO")} COP`}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 22px; font-weight: bold; color: #c4547a; border-top: 2px solid #e8a0b4; padding-top: 12px;">
              <span>TOTAL</span><span>$${order.total.toLocaleString("es-CO")} COP</span>
            </div>
          </div>

          <h2 style="color: #c4547a; font-size: 16px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">🚚 Entrega</h2>
          ${deliveryHtml}

          <div style="background: #fce8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h2 style="color: #9d3d5c; font-size: 15px; margin: 0 0 14px;">📋 Información importante sobre tu pedido</h2>
            <ul style="margin: 0; padding-left: 18px; color: #4a3f3d; font-size: 13px; line-height: 1.7;">
              <li>Al recibir tu paquete, revísalo y documenta cualquier novedad.</li>
              <li>Reporta novedades de transporte (faltante, daño, guía “entregado” sin recepción) <strong>dentro de las primeras 24 horas</strong> al WhatsApp ${whatsappEsc}, con fotos o video.</li>
              <li>No aplican cambios comerciales por gusto o resultado cosmético distinto al esperado. Sí aplica la garantía legal.</li>
              <li>Para cualquier inquietud escríbenos a <a href="mailto:atencionalcliente.befs@gmail.com" style="color: #c4547a;">atencionalcliente.befs@gmail.com</a> o al WhatsApp ${whatsappEsc}.</li>
            </ul>
          </div>

          <p style="margin: 0 0 10px; font-size: 14px;">
            <a href="${siteUrl}/politicas-envio" style="color: #c4547a; font-weight: 600;">Ver políticas de envío completas →</a>
          </p>
          <p style="margin: 0; font-size: 14px;">
            <a href="${siteUrl}/terminos-condiciones" style="color: #c4547a; font-weight: 600;">Términos y condiciones →</a>
          </p>
        </div>

        <div style="background: #f9eef4; padding: 22px; text-align: center;">
          <p style="margin: 0; color: #c4547a; font-size: 13px;">Four Sensations — atencionalcliente.befs@gmail.com</p>
          <p style="margin: 6px 0 0; color: #888; font-size: 12px;">Manizales, Caldas, Colombia</p>
          <p style="margin: 8px 0 0; color: #aaa; font-size: 11px;">Este correo fue generado automáticamente como confirmación de tu compra.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from,
      to,
      subject: `💕 Tu compra en Four Sensations está confirmada — ${order.reference}`,
      html,
    });
    console.log("[email] confirmación enviada al cliente:", to, order.reference);
  } catch (error) {
    console.error("[email] error confirmación cliente:", error);
  }
}
