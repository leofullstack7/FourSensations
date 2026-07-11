import { Resend } from "resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 14px;color:#5c4f4d;line-height:1.75;font-size:15px;">${escapeHtml(p)}</p>`)
    .join("");
}

export type CrmCustomerEmailInput = {
  to: string;
  customerName: string;
  subject: string;
  body: string;
};

export async function sendCrmCustomerEmail(input: CrmCustomerEmailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = input.to.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurada" };
  if (!to) return { ok: false, error: "Correo del cliente vacío" };

  const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  const resend = new Resend(apiKey);
  const firstName = input.customerName.trim().split(/\s+/)[0] || "Cliente";
  const subject = input.subject.trim() || "Novedades de GinnaBeauty para ti";
  const bodyHtml = textToHtmlParagraphs(input.body.trim() || "Tenemos novedades especiales para ti en GinnaBeauty.");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Georgia, 'Times New Roman', serif; background: #fdf6f9; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #fffef9; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(180,80,120,0.12);">
        <div style="background: linear-gradient(135deg, #c4547a, #e8a0b4); padding: 32px 28px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 26px; letter-spacing: 2px;">✨ GinnaBeauty</h1>
        </div>
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 18px; font-size: 17px; color: #3d2c2a;">Hola, <strong>${escapeHtml(firstName)}</strong> 💕</p>
          ${bodyHtml}
          <p style="margin: 20px 0 0; font-size: 14px; color: #888;">Con cariño,<br/>Equipo GinnaBeauty</p>
        </div>
        <div style="background: #f9eef4; padding: 18px; text-align: center;">
          <p style="margin: 0; color: #c4547a; font-size: 12px;">ginnabeautycosmeticos@gmail.com · Bogotá, Colombia</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({ from, to, subject, html });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo enviar el correo";
    console.error("[crm-email]", e);
    return { ok: false, error: msg };
  }
}
