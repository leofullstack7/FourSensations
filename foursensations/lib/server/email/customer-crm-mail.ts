import { sendTransactionalEmail } from "@/lib/server/email/send";
import {
  EMAIL_FONT_BODY,
  EMAIL_FONT_DISPLAY,
  EMAIL_GOOGLE_FONTS,
  escapeHtml,
} from "@/lib/server/email/templates";

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
  const to = input.to.trim();
  if (!to) return { ok: false, error: "Correo del cliente vacío" };

  const firstName = input.customerName.trim().split(/\s+/)[0] || "Cliente";
  const subject = input.subject.trim() || "Novedades de Four Sensations para ti";
  const bodyHtml = textToHtmlParagraphs(input.body.trim() || "Tenemos novedades especiales para ti en Four Sensations.");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8">${EMAIL_GOOGLE_FONTS}</head>
    <body style="font-family: ${EMAIL_FONT_BODY}; background: #fdf6f9; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #fffef9; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(180,80,120,0.12);">
        <div style="background: linear-gradient(135deg, #c4547a, #e8a0b4); padding: 32px 28px; text-align: center;">
          <h1 style="color: white; margin: 0; font-family: ${EMAIL_FONT_DISPLAY}; font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">✨ Four Sensations</h1>
        </div>
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 18px; font-size: 17px; color: #3d2c2a;">Hola, <strong>${escapeHtml(firstName)}</strong> 💕</p>
          ${bodyHtml}
          <p style="margin: 20px 0 0; font-size: 14px; color: #888;">Con cariño,<br/>Equipo Four Sensations</p>
        </div>
        <div style="background: #f9eef4; padding: 18px; text-align: center;">
          <p style="margin: 0; color: #c4547a; font-size: 12px;">pedidosfoursensations@gmail.com · Manizales, Caldas, Colombia</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const result = await sendTransactionalEmail({ to, subject, html });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
