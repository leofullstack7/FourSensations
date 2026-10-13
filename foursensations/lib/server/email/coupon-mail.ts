import { Resend } from "resend";

type CouponTheme = "rose" | "gold" | "violet" | "emerald" | "midnight";

const THEMES: Record<
  CouponTheme,
  { gradient: string; accent: string; soft: string; ticket: string }
> = {
  rose: {
    gradient: "linear-gradient(135deg, #c4547a, #e8a0b4)",
    accent: "#c4547a",
    soft: "#fdf6f9",
    ticket: "linear-gradient(160deg, #fff7fb 0%, #ffe8f1 55%, #ffd6e6 100%)",
  },
  gold: {
    gradient: "linear-gradient(135deg, #b8860b, #f0c14b)",
    accent: "#9a7209",
    soft: "#fffaf0",
    ticket: "linear-gradient(160deg, #fffdf5 0%, #fff1cc 55%, #ffe08a 100%)",
  },
  violet: {
    gradient: "linear-gradient(135deg, #6b3fa0, #b794f4)",
    accent: "#6b3fa0",
    soft: "#f8f4ff",
    ticket: "linear-gradient(160deg, #fbf8ff 0%, #efe4ff 55%, #d9c2ff 100%)",
  },
  emerald: {
    gradient: "linear-gradient(135deg, #0f766e, #5eead4)",
    accent: "#0f766e",
    soft: "#f0fdfa",
    ticket: "linear-gradient(160deg, #f3fffc 0%, #ccfbf1 55%, #99f6e4 100%)",
  },
  midnight: {
    gradient: "linear-gradient(135deg, #1e1b4b, #6366f1)",
    accent: "#4338ca",
    soft: "#eef2ff",
    ticket: "linear-gradient(160deg, #eef2ff 0%, #c7d2fe 55%, #a5b4fc 100%)",
  },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = input.to.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurada" };
  if (!to) return { ok: false, error: "Correo vacío" };

  const themeKey = (input.coupon.theme || "rose") as CouponTheme;
  const theme = THEMES[themeKey] || THEMES.rose;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const resend = new Resend(apiKey);
  const firstName = (input.toName?.trim() || "Belleza").split(/\s+/)[0] || "Belleza";
  const subject =
    input.subject?.trim() || `Tu cupón ${input.coupon.code} te espera en Four Sensations`;
  const personal = input.message?.trim()
    ? `<p style="margin:0 0 18px;color:#5c4f4d;line-height:1.7;font-size:15px;">${escapeHtml(input.message.trim())}</p>`
    : `<p style="margin:0 0 18px;color:#5c4f4d;line-height:1.7;font-size:15px;">Preparamos un detalle especial para tu próxima compra. Guarda este código y úsalo en el checkout.</p>`;
  const ends = input.coupon.endsAt
    ? `Válido hasta ${input.coupon.endsAt.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}`
    : "Sin fecha de vencimiento fija";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:${theme.soft};font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;background:#fffefb;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(60,20,40,0.12);">
    <div style="background:${theme.gradient};padding:28px 24px;text-align:center;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.85);font-size:11px;letter-spacing:0.22em;text-transform:uppercase;">Four Sensations</p>
      <h1 style="margin:0;color:#fff;font-size:26px;letter-spacing:0.04em;">Un regalo para tu ritual</h1>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 8px;font-size:17px;color:#3d2c2a;">Hola, <strong>${escapeHtml(firstName)}</strong></p>
      ${personal}
      <div style="margin:22px 0;padding:22px 18px;border-radius:16px;background:${theme.ticket};border:1px dashed ${theme.accent};text-align:center;">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${theme.accent};">${escapeHtml(input.coupon.typeLabel)}</p>
        <p style="margin:0 0 10px;font-size:15px;color:#3d2c2a;">${escapeHtml(input.coupon.name)}</p>
        <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.12em;color:#1f1412;">${escapeHtml(input.coupon.code)}</p>
        <p style="margin:10px 0 0;font-size:18px;color:${theme.accent};">${escapeHtml(input.coupon.valueLabel)}</p>
        <p style="margin:10px 0 0;font-size:12px;color:#7a6a68;">${escapeHtml(ends)}</p>
      </div>
      ${
        input.coupon.description
          ? `<p style="margin:0 0 18px;font-size:14px;color:#6b5b59;line-height:1.6;">${escapeHtml(input.coupon.description)}</p>`
          : ""
      }
      <div style="text-align:center;margin-top:8px;">
        <a href="${escapeHtml(input.storeUrl)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:${theme.gradient};color:#fff;text-decoration:none;font-size:14px;letter-spacing:0.04em;">Ir a la tienda</a>
      </div>
    </div>
    <div style="background:${theme.soft};padding:16px;text-align:center;">
      <p style="margin:0;color:${theme.accent};font-size:12px;">atencionalcliente.befs@gmail.com · Manizales, Colombia</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await resend.emails.send({ from, to, subject, html });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo enviar el correo";
    console.error("[coupon-email]", e);
    return { ok: false, error: msg };
  }
}

export function couponValueLabel(type: string, value: number): string {
  if (type === "PERCENT") return `${value}% de descuento`;
  if (type === "FIXED") return `$${value.toLocaleString("es-CO")} de descuento`;
  return "Envío gratis";
}
