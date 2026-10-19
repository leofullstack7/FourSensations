import { sendTransactionalEmail } from "@/lib/server/email/send";
import { emailShell, escapeHtml, softCard, sectionTitle, goldDivider } from "@/lib/server/email/templates";

export type SendCouponEmailInput = {
  to: string;
  toName?: string;
  subject?: string;
  message?: string;
  coupon: {
    code: string;
    name: string;
    description?: string | null;
    typeLabel: string;
    valueLabel: string;
    endsAt?: Date | null;
    theme?: string;
  };
  storeUrl: string;
};

function siteBase(storeUrl: string): string {
  return storeUrl.replace(/\/$/, "") || "https://foursensations.onrender.com";
}

/** Correo de bienvenida — layout claro tipo referencia (rosa / lavanda). */
export async function sendWelcomeCouponEmail(input: {
  to: string;
  storeUrl: string;
  coupon: { code: string; valueLabel: string; percent: number };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = input.to.trim();
  if (!to) return { ok: false, error: "Correo vacío" };

  const base = siteBase(input.storeUrl);
  const bannerUrl = `${base}/email/bannercorreocupon.jpg`;
  const code = escapeHtml(input.coupon.code);
  const pct = input.coupon.percent;
  const subject = "Girl, ¡bienvenida al club! Tu cupón te espera 🎀";

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#fdf0f5;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf0f5;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #f0d4e0;">
        <tr><td style="padding:22px 22px 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#9b6b9e;">
          FOUR SENSATIONS · EL CLUB DE LOS CABELLOS PERFECTOS
        </td></tr>
        <tr><td style="padding:0 16px 8px;">
          <img src="${escapeHtml(bannerUrl)}" alt="Four Sensations" width="528" style="display:block;width:100%;max-width:528px;height:auto;border-radius:12px;"/>
        </td></tr>
        <tr><td style="padding:18px 28px 6px;text-align:center;">
          <p style="margin:0 0 10px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#8b5a9e;font-weight:700;">
            Girl, ¡bienvenida al club! 🎀
          </p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#a07aa8;">
            Tus próximos must-haves capilares están esperando por ti. Y como toda buena bienvenida merece algo especial, tenemos un regalito para tu primera compra.
          </p>
        </td></tr>
        <tr><td style="padding:18px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fce8f1;border-radius:16px;">
            <tr><td style="padding:22px 18px;text-align:center;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#9b6b9e;font-weight:700;">
                UN REGALITO SOLO PARA TI
              </p>
              <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:36px;line-height:1;color:#8b5a9e;font-weight:700;">
                ${pct}% OFF
              </p>
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#a07aa8;">
                en tu primera compra
              </p>
              <p style="margin:0 auto 10px;display:inline-block;padding:12px 22px;background:#fff;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:20px;letter-spacing:0.14em;font-weight:800;color:#8b5a9e;">
                ${code}
              </p>
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a07aa8;">
                Usa este código al finalizar tu compra.
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:8px 28px 24px;text-align:center;">
          <a href="${escapeHtml(base)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:#9b6b9e;color:#fff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;letter-spacing:0.06em;font-weight:700;">
            ¡QUIERO MIS MUST-HAVES! ♡
          </a>
          <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#b08ab0;">
            Tu historia con FOUR SENSATIONS apenas comienza. ✨
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const result = await sendTransactionalEmail({ to, subject, html });
  if (!result.ok) {
    console.error("[welcome-coupon-email]", result.error);
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function sendCouponGiftEmail(
  input: SendCouponEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = input.to.trim();
  if (!to) return { ok: false, error: "Correo vacío" };

  const firstName = (input.toName?.trim() || "Belleza").split(/\s+/)[0] || "Belleza";
  const subject =
    input.subject?.trim() || `Tu cupón ${input.coupon.code} te espera en Four Sensations`;
  const ends = input.coupon.endsAt
    ? `Válido hasta ${input.coupon.endsAt.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`
    : "Sin fecha de vencimiento fija";
  const personal = input.message?.trim()
    ? escapeHtml(input.message.trim())
    : "Preparamos un detalle especial para tu próxima compra. Guarda este código y úsalo en el checkout — con o sin iniciar sesión.";

  const bodyHtml = `
    <p style="margin:0 0 8px;text-align:center;font-size:16px;line-height:1.6;color:#fff8f2;">
      Hola, <strong style="color:#f0c9d4;">${escapeHtml(firstName)}</strong>
    </p>
    <p style="margin:0 0 22px;text-align:center;font-size:15px;line-height:1.7;color:#f0c9d4;">
      ${personal}
    </p>
    ${sectionTitle("Tu cupón")}
    ${softCard(`
      <p style="margin:0 0 6px;text-align:center;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#d4af7a;">
        ${escapeHtml(input.coupon.typeLabel)}
      </p>
      <p style="margin:0 0 10px;text-align:center;font-size:15px;color:#fff8f2;">
        ${escapeHtml(input.coupon.name)}
      </p>
      <p style="margin:0;text-align:center;font-size:34px;font-weight:700;letter-spacing:0.14em;color:#fff8f2;">
        ${escapeHtml(input.coupon.code)}
      </p>
      <p style="margin:12px 0 0;text-align:center;font-size:18px;color:#f0c9d4;">
        ${escapeHtml(input.coupon.valueLabel)}
      </p>
      <p style="margin:10px 0 0;text-align:center;font-size:12px;color:#c9a8b4;">
        ${escapeHtml(ends)}
      </p>
    `)}
    ${
      input.coupon.description
        ? `<p style="margin:0 0 18px;text-align:center;font-size:14px;line-height:1.65;color:#c9a8b4;">${escapeHtml(input.coupon.description)}</p>`
        : ""
    }
    ${goldDivider()}
    <div style="text-align:center;margin:8px 0 4px;">
      <a href="${escapeHtml(input.storeUrl)}" style="display:inline-block;padding:13px 26px;border-radius:999px;background:linear-gradient(135deg,#c4547a,#e8a0b4);color:#fff;text-decoration:none;font-size:14px;letter-spacing:0.06em;">
        Ir a la tienda
      </a>
    </div>
  `;

  const html = emailShell({
    preheader: `${input.coupon.code} · ${input.coupon.valueLabel} te espera en Four Sensations`,
    heroTitle: "Un regalo para tu ritual",
    heroSubtitle: "El Club de los Cabellos Perfectos",
    bodyHtml,
    footerNote: "Four Sensations — atencionalcliente.befs@gmail.com · Manizales, Colombia",
  });

  const result = await sendTransactionalEmail({ to, subject, html });
  if (!result.ok) {
    console.error("[coupon-email]", result.error);
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export function couponValueLabel(type: string, value: number): string {
  if (type === "PERCENT") return `${value}% de descuento`;
  if (type === "FIXED") return `$${value.toLocaleString("es-CO")} de descuento`;
  return "Envío gratis";
}
