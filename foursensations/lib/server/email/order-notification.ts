import type { Prisma } from "@prisma/client";
import { resolveStoreNotifyEmail, sendTransactionalEmail } from "@/lib/server/email/send";
import {
  EMAIL_FONT_BODY,
  EMAIL_FONT_DISPLAY,
  EMAIL_GOOGLE_FONTS,
  escapeHtml,
  formatColombiaDateTime,
} from "@/lib/server/email/templates";

function parseShippingFromJson(shippingAddress: Prisma.JsonValue): {
  shippingZoneLabel: string;
  shippingAddressLine: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  shippingCarrierLabel: string;
  neighborhood: string;
  documentNumber: string;
  city: string;
  region: string;
  fulfillment: string;
  couponCode: string;
  couponDiscount: number;
} {
  try {
    const addr =
      typeof shippingAddress === "object" && shippingAddress !== null && !Array.isArray(shippingAddress)
        ? (shippingAddress as Record<string, unknown>)
        : {};
    const str = (...keys: string[]) => {
      for (const k of keys) {
        const v = addr[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
      return "";
    };
    const label =
      typeof addr.shippingZoneLabel === "string" && addr.shippingZoneLabel.trim()
        ? addr.shippingZoneLabel
        : "No especificada";
    const carrier =
      typeof addr.shippingCarrierLabel === "string" && addr.shippingCarrierLabel.trim()
        ? addr.shippingCarrierLabel
        : typeof addr.shippingCarrier === "string" && addr.shippingCarrier === "interrapidismo"
          ? "Interrapidísimo"
          : typeof addr.shippingCarrier === "string" && addr.shippingCarrier === "pickup"
            ? "Recoger en tienda"
            : "Envía";
    const line1 = str("line1", "address", "street", "direccion");
    const line2 = str("line2");
    const city = str("city", "ciudad");
    const region = str("region", "state", "departamento");
    const postalCode = str("postalCode", "zip", "codigoPostal");
    const parts = [line1, line2, city, region, postalCode].filter(Boolean);
    return {
      shippingZoneLabel: label,
      shippingAddressLine: parts.length ? parts.join(", ") : "No especificada",
      addressLine1: line1,
      addressLine2: line2,
      postalCode,
      shippingCarrierLabel: carrier,
      neighborhood: str("neighborhood", "barrio") || line2,
      documentNumber: str("documentNumber", "document", "cedula"),
      city,
      region,
      fulfillment: str("fulfillment"),
      couponCode: typeof addr.couponCode === "string" ? addr.couponCode : "",
      couponDiscount: typeof addr.couponDiscount === "number" ? addr.couponDiscount : 0,
    };
  } catch {
    return {
      shippingZoneLabel: "No especificada",
      shippingAddressLine: "No especificada",
      addressLine1: "",
      addressLine2: "",
      postalCode: "",
      shippingCarrierLabel: "Envía",
      neighborhood: "",
      documentNumber: "",
      city: "",
      region: "",
      fulfillment: "",
      couponCode: "",
      couponDiscount: 0,
    };
  }
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

function money(n: number): string {
  return `$${Math.max(0, Math.floor(n)).toLocaleString("es-CO")} COP`;
}

const wrap = "word-break:break-word;overflow-wrap:anywhere;white-space:pre-wrap;";

export async function sendOrderNotification(order: {
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
  shippingCarrierLabel?: string;
  paymentProvider: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string | null;
  }>;
  shippingAddress: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  neighborhood?: string;
  documentNumber?: string;
  city?: string;
  region?: string;
  customerNote?: string | null;
  createdAt?: Date | string | null;
}): Promise<void> {
  const to = await resolveStoreNotifyEmail();
  if (!to) {
    console.warn("[email] sin destinatario de tienda, omitiendo aviso interno");
    return;
  }

  const refEsc = escapeHtml(order.reference);
  const nameEsc = escapeHtml(order.customerName);
  const emailEsc = escapeHtml(order.customerEmail);
  const phoneEsc = escapeHtml(order.customerPhone || "—");
  const line1Esc = escapeHtml(order.addressLine1 || order.shippingAddress || "—");
  const line2Esc = escapeHtml(order.addressLine2 || "—");
  const postalEsc = escapeHtml(order.postalCode || "—");
  const fullAddrEsc = escapeHtml(order.shippingAddress || "—");
  const docEsc = escapeHtml(order.documentNumber || "—");
  const cityEsc = escapeHtml(order.city || "—");
  const regionEsc = escapeHtml(order.region || "—");
  const noteEsc = escapeHtml(order.customerNote?.trim() || "—");
  const zoneEsc = escapeHtml(order.shippingZoneLabel || "—");
  const payEsc = escapeHtml(paymentLabel(order.paymentProvider));
  const isPickup =
    /recoger/i.test(order.shippingZoneLabel) || /tienda/i.test(order.shippingCarrierLabel || "");
  const methodEsc = escapeHtml(
    isPickup ? "Recoger en tienda" : order.shippingCarrierLabel || order.shippingZoneLabel,
  );
  const discount = Math.max(0, order.discount ?? 0);
  const couponLabel = order.couponCode?.trim()
    ? `Cupón ${order.couponCode.trim()}`
    : discount > 0
      ? "Cupón de bienvenida"
      : "";

  const dateLabel = formatColombiaDateTime(order.createdAt ?? new Date());

  const itemRows = order.items
    .map((item) => {
      const img = item.imageUrl?.trim()
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" width="44" height="44" style="display:block;width:44px;height:44px;object-fit:cover;border-radius:10px;border:1px solid #f0d4e0;"/>`
        : `<div style="width:44px;height:44px;border-radius:10px;background:#fce8f1;"></div>`;
      const line = item.unitPrice * item.quantity;
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f7e4ec;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:10px;">${img}</td>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5a245f;font-weight:600;${wrap}">${escapeHtml(item.productName)}</td>
          </tr></table>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f7e4ec;text-align:center;font-size:13px;color:#7a5564;">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f7e4ec;text-align:right;font-size:12px;color:#7a5564;">${money(item.unitPrice)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f7e4ec;text-align:right;font-size:13px;color:#5a245f;font-weight:700;">${money(line)}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>${EMAIL_GOOGLE_FONTS}</head>
<body style="margin:0;padding:0;background:#fdeff4;font-family:${EMAIL_FONT_BODY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdeff4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">
        <tr><td style="padding:8px 8px 16px;text-align:center;">
          <p style="margin:0;font-family:${EMAIL_FONT_DISPLAY};font-size:28px;color:#5a245f;font-weight:800;letter-spacing:-0.02em;line-height:1.15;">Four Sensations</p>
          <p style="margin:6px 0 0;font-family:${EMAIL_FONT_BODY};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#b08ab0;font-weight:700;">EL CLUB DE LOS CABELLOS PERFECTOS</p>
        </td></tr>

        <tr><td style="padding:0 0 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;border:1px solid #f0d4e0;">
            <tr><td style="padding:22px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <p style="margin:0 0 6px;font-size:18px;">🎀</p>
                    <p style="margin:0 0 4px;font-family:${EMAIL_FONT_BODY};font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#c4547a;font-weight:700;">NUEVA ORDEN</p>
                    <p style="margin:0;font-family:${EMAIL_FONT_DISPLAY};font-size:26px;line-height:1.2;color:#5a245f;font-weight:800;letter-spacing:-0.02em;">
                      ¡Tenemos un <span style="color:#c4547a;font-weight:800;">nuevo pedido!</span>
                    </p>
                  </td>
                  <td style="vertical-align:top;width:42%;padding-left:12px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf0f5;border-radius:14px;">
                      <tr><td style="padding:12px 14px;font-size:12px;color:#7a5564;line-height:1.55;">
                        <p style="margin:0 0 6px;">📅 <strong style="color:#5a245f;">Fecha y hora</strong><br/>${escapeHtml(dateLabel)}</p>
                        <p style="margin:0;">🧾 <strong style="color:#5a245f;">Número de pedido</strong><br/><span style="font-size:15px;font-weight:800;color:#5a245f;">${refEsc}</span></p>
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
              <p style="margin:0;font-family:${EMAIL_FONT_DISPLAY};font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#5a245f;font-weight:800;">👤 DATOS DE LA CLIENTE</p>
            </td></tr>
            <tr><td style="padding:8px 20px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.75;">
                <tr>
                  <td style="width:50%;vertical-align:top;padding-right:10px;color:#5a245f;${wrap}">
                    <span style="color:#c4547a;font-size:11px;">Nombre completo</span><br/><strong>${nameEsc}</strong><br/>
                    <span style="color:#c4547a;font-size:11px;">Cédula</span><br/>${docEsc}<br/>
                    <span style="color:#c4547a;font-size:11px;">Celular</span><br/>${phoneEsc}<br/>
                    <span style="color:#c4547a;font-size:11px;">Correo electrónico</span><br/>${emailEsc}
                  </td>
                  <td style="width:50%;vertical-align:top;color:#5a245f;${wrap}">
                    <span style="color:#c4547a;font-size:11px;">Método de entrega</span><br/>${methodEsc}<br/>
                    <span style="color:#c4547a;font-size:11px;">Zona</span><br/>${zoneEsc}<br/>
                    <span style="color:#c4547a;font-size:11px;">Pago</span><br/>${payEsc}
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 0 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;border:1px solid #f0d4e0;">
            <tr><td style="padding:18px 20px 6px;">
              <p style="margin:0;font-family:${EMAIL_FONT_DISPLAY};font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#5a245f;font-weight:800;">📦 INFORMACIÓN DE ENVÍO</p>
            </td></tr>
            <tr><td style="padding:8px 20px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.7;color:#5a245f;">
                <tr>
                  <td style="padding:6px 0;${wrap}">
                    <span style="color:#c4547a;font-size:11px;">Dirección</span><br/>
                    <strong>${line1Esc}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;${wrap}">
                    <span style="color:#c4547a;font-size:11px;">Apto / torre</span><br/>
                    ${line2Esc}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:33%;vertical-align:top;padding-right:8px;${wrap}">
                          <span style="color:#c4547a;font-size:11px;">Ciudad</span><br/>${cityEsc}
                        </td>
                        <td style="width:33%;vertical-align:top;padding-right:8px;${wrap}">
                          <span style="color:#c4547a;font-size:11px;">Departamento</span><br/>${regionEsc}
                        </td>
                        <td style="width:34%;vertical-align:top;${wrap}">
                          <span style="color:#c4547a;font-size:11px;">Cód. postal</span><br/>${postalEsc}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;${wrap}">
                    <span style="color:#c4547a;font-size:11px;">Dirección completa</span><br/>
                    ${fullAddrEsc}
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf0f5;border-radius:12px;">
                      <tr><td style="padding:12px 14px;${wrap}">
                        <span style="color:#c4547a;font-size:11px;font-weight:700;">Especificaciones adicionales / notas de la cliente</span><br/>
                        <span style="color:#5a245f;font-size:13px;line-height:1.55;">${noteEsc}</span>
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
              <p style="margin:0;font-family:${EMAIL_FONT_DISPLAY};font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#5a245f;font-weight:800;">🛍️ PRODUCTOS DEL PEDIDO</p>
            </td></tr>
            <tr><td style="padding:4px 12px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr style="background:#fdf0f5;">
                  <th align="left" style="padding:8px;font-size:10px;letter-spacing:0.1em;color:#9b6b9e;">PRODUCTO</th>
                  <th align="center" style="padding:8px;font-size:10px;letter-spacing:0.1em;color:#9b6b9e;">CANT.</th>
                  <th align="right" style="padding:8px;font-size:10px;letter-spacing:0.1em;color:#9b6b9e;">PRECIO UNITARIO</th>
                  <th align="right" style="padding:8px;font-size:10px;letter-spacing:0.1em;color:#9b6b9e;">TOTAL</th>
                </tr>
                ${itemRows}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 0 14px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px;border:1px solid #f0d4e0;">
            <tr><td style="padding:16px 18px;">
              <p style="margin:0 0 12px;font-family:${EMAIL_FONT_DISPLAY};font-size:13px;letter-spacing:0.1em;text-transform:uppercase;color:#5a245f;font-weight:800;">💳 DETALLE DE PAGO</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#7a5564;">
                <tr><td style="padding:4px 0;">Subtotal</td><td align="right">${money(order.subtotal)}</td></tr>
                ${
                  discount > 0
                    ? `<tr><td style="padding:4px 0;">Descuento${couponLabel ? ` (${escapeHtml(couponLabel)})` : ""}</td><td align="right" style="color:#c4547a;">−${money(discount)}</td></tr>`
                    : ""
                }
                <tr><td style="padding:4px 0;">Envío</td><td align="right">${money(order.shipping)}</td></tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;background:#fce8f1;border-radius:12px;">
                <tr><td style="padding:12px 14px;font-size:13px;color:#5a245f;font-weight:700;">Total</td>
                <td align="right" style="padding:12px 14px;font-size:18px;color:#5a245f;font-weight:800;">${money(order.total)}</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:10px;text-align:center;">
          <p style="margin:0;font-size:18px;">🎀</p>
          <p style="margin:6px 0 0;font-family:${EMAIL_FONT_DISPLAY};font-size:18px;color:#5a245f;font-weight:800;letter-spacing:-0.02em;">Four Sensations</p>
          <p style="margin:4px 0 0;font-family:${EMAIL_FONT_BODY};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#b08ab0;font-weight:700;">EL CLUB DE LOS CABELLOS PERFECTOS</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const result = await sendTransactionalEmail({
    to,
    subject: `Nueva orden ${order.reference} — ${money(order.total)}`,
    html,
  });
  if (!result.ok) {
    console.error("[email] notificación tienda falló:", result.error);
    throw new Error(`Email tienda falló: ${result.error}`);
  }
  console.log("[email] notificación enviada a tienda vía", result.provider, to, order.reference);
}

export function orderPayloadForEmail(order: {
  reference: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNote?: string | null;
  subtotal: number;
  shipping: number;
  discount?: number;
  total: number;
  shippingAddress: Prisma.JsonValue;
  paymentProvider: string | null;
  couponCode?: string | null;
  createdAt?: Date;
  items: Array<{ name: string; quantity: number; unitPrice: number; imageUrl?: string | null }>;
}): Parameters<typeof sendOrderNotification>[0] {
  const parsed = parseShippingFromJson(order.shippingAddress);
  return {
    reference: order.reference,
    customerName: order.customerName?.trim() || "Cliente",
    customerEmail: order.customerEmail?.trim() || "",
    customerPhone: order.customerPhone?.trim() || "",
    total: order.total,
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount ?? parsed.couponDiscount ?? 0,
    couponCode: order.couponCode ?? parsed.couponCode ?? null,
    shippingZoneLabel: parsed.shippingZoneLabel,
    shippingCarrierLabel: parsed.shippingCarrierLabel,
    paymentProvider: order.paymentProvider?.trim() || "MERCADOPAGO",
    items: order.items.map((item) => ({
      productName: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      imageUrl: item.imageUrl ?? null,
    })),
    shippingAddress: parsed.shippingAddressLine,
    addressLine1: parsed.addressLine1,
    addressLine2: parsed.addressLine2,
    postalCode: parsed.postalCode,
    neighborhood: parsed.neighborhood,
    documentNumber: parsed.documentNumber,
    city: parsed.city,
    region: parsed.region,
    customerNote: order.customerNote?.trim() || null,
    createdAt: order.createdAt ?? null,
  };
}
