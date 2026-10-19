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
