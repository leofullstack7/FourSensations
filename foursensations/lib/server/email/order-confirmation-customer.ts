import type { Prisma } from "@prisma/client";
import { orderPayloadForEmail } from "@/lib/server/email/order-notification";
import { sendTransactionalEmail } from "@/lib/server/email/send";
import { getWhatsAppDisplayNumber } from "@/lib/storefront-contact";
import { escapeHtml } from "@/lib/server/email/templates";

function extractShippingMeta(shippingAddress: Prisma.JsonValue): {
  zoneId: string;
  neighborhood: string;
  documentNumber: string;
  fulfillment: string;
  couponCode: string;
  couponDiscount: number;
} {
  try {
    const addr =
      typeof shippingAddress === "object" && shippingAddress !== null && !Array.isArray(shippingAddress)
        ? (shippingAddress as Record<string, unknown>)
        : {};
    return {
      zoneId: typeof addr.shippingZoneId === "string" ? addr.shippingZoneId.trim() : "",
      neighborhood: typeof addr.neighborhood === "string" ? addr.neighborhood.trim() : typeof addr.line2 === "string" ? addr.line2.trim() : "",
      documentNumber: typeof addr.documentNumber === "string" ? addr.documentNumber.trim() : "",
      fulfillment: typeof addr.fulfillment === "string" ? addr.fulfillment.trim() : "",
      couponCode: typeof addr.couponCode === "string" ? addr.couponCode.trim() : "",
      couponDiscount: typeof addr.couponDiscount === "number" ? addr.couponDiscount : 0,
    };
  } catch {
    return { zoneId: "", neighborhood: "", documentNumber: "", fulfillment: "", couponCode: "", couponDiscount: 0 };
  }
}

function money(n: number): string {
  return `$${Math.max(0, Math.floor(n)).toLocaleString("es-CO")} COP`;
}

function paymentLabel(provider: string): string {
  const p = provider.trim().toUpperCase();
  if (p === "MERCADOPAGO" || p === "MERCADO PAGO") return "Mercado Pago";
  if (p === "EPAYCO") return "ePayco";
  if (p === "BOLD") return "Bold";
  if (p === "ADDI") return "Addi";
  if (p === "CONTRAENTREGA") return "Contraentrega";
  return provider || "Mercado Pago";
}

export type CustomerOrderConfirmationInput = {
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  subtotal: number;
  shipping: number;
  discount?: number;
  couponCode?: string | null;
  shippingZoneLabel: string;
  shippingZoneId: string;
  shippingCarrierLabel?: string;
  paymentProvider: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string | null;
  }>;
  shippingAddress: string;
  neighborhood?: string;
  documentNumber?: string;
  createdAt?: Date | string | null;
};

export function buildCustomerOrderConfirmationPayload(order: {
  reference: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  shippingAddress: Prisma.JsonValue;
  paymentProvider: string | null;
  couponCode?: string | null;
  createdAt?: Date;
  items: Array<{ name: string; quantity: number; unitPrice: number; imageUrl?: string | null }>;
}): CustomerOrderConfirmationInput | null {
  if (!order.customerEmail?.trim()) return null;
  const base = orderPayloadForEmail(order);
  const meta = extractShippingMeta(order.shippingAddress);
  return {
    ...base,
    discount: order.discount ?? meta.couponDiscount ?? 0,
    couponCode: order.couponCode ?? meta.couponCode ?? null,
    shippingZoneId: meta.zoneId,
    neighborhood: meta.neighborhood,
    documentNumber: meta.documentNumber,
    createdAt: order.createdAt ?? null,
    items: order.items.map((item) => ({
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      imageUrl: item.imageUrl ?? null,
    })),
  };
}

/** Confirmación al cliente — layout claro rosa/lavanda (referencia img2). */
export async function sendOrderConfirmationToCustomer(order: CustomerOrderConfirmationInput): Promise<void> {
  const to = order.customerEmail?.trim();
  if (!to) {
    console.warn("[email] correo del cliente vacío, omitiendo confirmación");
    return;
  }

  const whatsapp = getWhatsAppDisplayNumber();
  const firstName = order.customerName.trim().split(/\s+/)[0] || "Girl";
  const refEsc = escapeHtml(order.reference);
  const nameEsc = escapeHtml(order.customerName);
  const firstEsc = escapeHtml(firstName);
  const emailEsc = escapeHtml(order.customerEmail);
  const phoneEsc = escapeHtml(order.customerPhone || "—");
  const addrEsc = escapeHtml(order.shippingAddress);
  const barrioEsc = escapeHtml(order.neighborhood || "—");
  const docEsc = escapeHtml(order.documentNumber || "—");
  const payEsc = escapeHtml(paymentLabel(order.paymentProvider));
  const zoneEsc = escapeHtml(order.shippingZoneLabel);
  const isPickup = order.shippingZoneId === "pickup" || /recoger/i.test(order.shippingZoneLabel);
  const discount = Math.max(0, order.discount ?? 0);
  const couponLabel = order.couponCode?.trim()
    ? `Cupón ${order.couponCode.trim()}`
    : discount > 0
      ? "Cupón de bienvenida"
      : "";

  const dateLabel = order.createdAt
    ? new Date(order.createdAt).toLocaleString("es-CO", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  const itemRows = order.items
    .map((item) => {
      const img = item.imageUrl?.trim()
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" width="48" height="48" style="display:block;width:48px;height:48px;object-fit:cover;border-radius:10px;border:1px solid #f0d4e0;"/>`
        : `<div style="width:48px;height:48px;border-radius:10px;background:#fce8f1;"></div>`;
      const line = item.unitPrice * item.quantity;
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f7e4ec;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:10px;">${img}</td>
            <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a245f;font-weight:600;">${escapeHtml(item.productName)}</td>
          </tr></table>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f7e4ec;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7a5564;">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f7e4ec;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7a5564;">${money(item.unitPrice)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f7e4ec;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a245f;font-weight:700;">${money(line)}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#fdeff4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdeff4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
        <tr><td style="padding:8px 8px 18px;text-align:center;">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#5a245f;font-weight:700;">Four Sensations</p>
          <p style="margin:6px 0 0;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#b08ab0;">EL CLUB DE LOS CABELLOS PERFECTOS</p>
        </td></tr>

        <tr><td style="padding:0 0 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;border:1px solid #f0d4e0;">
            <tr><td style="padding:22px 22px 8px;text-align:center;">
              <p style="margin:0 0 8px;font-size:18px;">🎀 ♡</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;color:#5a245f;font-weight:800;">
                Girl, ¡tu pedido está <span style="font-family:Georgia,serif;font-style:italic;color:#c4547a;font-weight:700;">confirmado</span>!
              </p>
              <p style="margin:12px 0 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#b08ab0;font-weight:700;">
                GRACIAS POR SER PARTE DE ESTE CLUB. TU CABELLO ESTÁ EN LAS MEJORES MANOS.
              </p>
            </td></tr>
            <tr><td style="padding:8px 22px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top;padding:8px;width:55%;">
                    <p style="margin:0 0 6px;font-size:15px;color:#5a245f;font-weight:700;">¡Hola, ${firstEsc}!</p>
                    <p style="margin:0;font-size:13px;line-height:1.55;color:#7a5564;">
                      Estamos preparando tu pedido con todo el cuidado que mereces. Pronto estará en camino.
                    </p>
                  </td>
                  <td style="vertical-align:top;padding:8px;width:45%;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf0f5;border-radius:14px;">
                      <tr><td style="padding:12px 14px;">
                        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#9b6b9e;font-weight:700;">✓ PEDIDO CONFIRMADO</p>
                        <p style="margin:0 0 4px;font-size:12px;color:#7a5564;">Nº <strong style="color:#5a245f;">${refEsc}</strong></p>
                        ${dateLabel ? `<p style="margin:0;font-size:11px;color:#a07aa8;">📅 ${escapeHtml(dateLabel)}</p>` : ""}
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 0 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;border:1px solid #f0d4e0;">
            <tr><td style="padding:18px 20px 6px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5a245f;font-weight:800;">👤 TUS DATOS DE COMPRA</p>
            </td></tr>
            <tr><td style="padding:8px 20px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:50%;vertical-align:top;padding-right:10px;font-size:13px;line-height:1.7;color:#5a245f;">
                    <strong>${nameEsc}</strong><br/>
                    Cédula: ${docEsc}<br/>
                    Tel: ${phoneEsc}<br/>
                    ${emailEsc}
                  </td>
                  <td style="width:50%;vertical-align:top;font-size:13px;line-height:1.7;color:#5a245f;">
                    ${addrEsc}<br/>
                    Barrio: ${barrioEsc}<br/>
                    ${zoneEsc}
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 0 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;border:1px solid #f0d4e0;">
            <tr><td style="padding:18px 20px 6px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5a245f;font-weight:800;">🛍️ PRODUCTOS DE TU PEDIDO</p>
            </td></tr>
            <tr><td style="padding:4px 12px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr style="background:#fdf0f5;">
                  <th align="left" style="padding:8px;font-size:10px;letter-spacing:0.1em;color:#9b6b9e;">PRODUCTO</th>
                  <th align="center" style="padding:8px;font-size:10px;letter-spacing:0.1em;color:#9b6b9e;">CANT.</th>
                  <th align="right" style="padding:8px;font-size:10px;letter-spacing:0.1em;color:#9b6b9e;">UNITARIO</th>
                  <th align="right" style="padding:8px;font-size:10px;letter-spacing:0.1em;color:#9b6b9e;">TOTAL</th>
                </tr>
                ${itemRows}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 0 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:52%;vertical-align:top;padding-right:8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;border:1px solid #f0d4e0;">
                  <tr><td style="padding:16px 18px;">
                    <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5a245f;font-weight:800;">💳 DETALLE DE PAGO</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#7a5564;">
                      <tr><td style="padding:4px 0;">Subtotal</td><td align="right" style="padding:4px 0;">${money(order.subtotal)}</td></tr>
                      ${
                        discount > 0
                          ? `<tr><td style="padding:4px 0;">Descuento${couponLabel ? ` (${escapeHtml(couponLabel)})` : ""}</td><td align="right" style="padding:4px 0;color:#c4547a;">−${money(discount)}</td></tr>`
                          : ""
                      }
                      <tr><td style="padding:4px 0;">Envío${isPickup ? " (Recoger en tienda)" : ""}</td><td align="right" style="padding:4px 0;">${money(order.shipping)}</td></tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;background:#fce8f1;border-radius:12px;">
                      <tr><td style="padding:12px 14px;font-size:13px;color:#5a245f;font-weight:700;">Total pagado</td>
                      <td align="right" style="padding:12px 14px;font-size:18px;color:#5a245f;font-weight:800;">${money(order.total)}</td></tr>
                    </table>
                    <p style="margin:10px 0 0;font-size:12px;color:#a07aa8;">Pago: ${payEsc}</p>
                  </td></tr>
                </table>
              </td>
              <td style="width:48%;vertical-align:top;padding-left:8px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;border:1px solid #f0d4e0;height:100%;">
                  <tr><td style="padding:16px 18px;">
                    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5a245f;font-weight:800;">🚚 INFORMACIÓN SOBRE EL ENVÍO</p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#7a5564;">
                      Preparamos tu pedido en máximo <strong style="color:#5a245f;">2 días hábiles</strong> desde Manizales.
                      ${isPickup ? "Puedes recogerlo en tienda cuando te avisemos." : "Te enviaremos la guía cuando salga."}
                    </p>
                    <p style="margin:12px 0 0;font-size:12px;color:#a07aa8;">WhatsApp: ${escapeHtml(whatsapp)}</p>
                  </td></tr>
                </table>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px;text-align:center;">
          <p style="margin:0;font-family:Georgia,serif;font-size:16px;color:#5a245f;">Four Sensations</p>
          <p style="margin:6px 0 0;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#b08ab0;">EL CLUB DE LOS CABELLOS PERFECTOS</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const result = await sendTransactionalEmail({
    to,
    subject: `Girl, ¡tu pedido ${order.reference} está confirmado! 🎀`,
    html,
  });
  if (!result.ok) {
    console.error("[email] confirmación cliente falló:", result.error);
    throw new Error(`Email cliente falló: ${result.error}`);
  }
  console.log("[email] confirmación enviada al cliente vía", result.provider, to, order.reference);
}
