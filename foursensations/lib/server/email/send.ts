import nodemailer from "nodemailer";
import { Resend } from "resend";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; provider: "gmail" | "resend"; id?: string }
  | { ok: false; error: string };

function smtpConfigured(): { user: string; pass: string } | null {
  // Brevo / SMTP genérico primero; Gmail App Password como alternativa
  const user = process.env.SMTP_USER?.trim() || process.env.GMAIL_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return null;
  return { user, pass };
}

function resendConfigured(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  return { apiKey, from };
}

/**
 * Preferencia: SMTP (Brevo / Gmail App Password) → Resend.
 * Sin dominio propio: Brevo deja enviar a cualquier clienta tras verificar el Gmail como sender.
 */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const toList = (Array.isArray(input.to) ? input.to : [input.to]).map((t) => t.trim()).filter(Boolean);
  if (toList.length === 0) return { ok: false, error: "Destinatario vacío" };

  const smtp = smtpConfigured();
  if (smtp) {
    try {
      const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
      const isBrevo = /brevo\.com|sendinblue\.com/i.test(host);
      const port = Number(process.env.SMTP_PORT?.trim() || (isBrevo ? "587" : "465"));
      const secureDefault = isBrevo || port === 587 ? "false" : "true";
      const secure = (process.env.SMTP_SECURE?.trim() || secureDefault) !== "false";
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: smtp.user, pass: smtp.pass },
      });
      const fromName = process.env.EMAIL_FROM_NAME?.trim() || "Four Sensations";
      const from =
        process.env.EMAIL_FROM?.trim() ||
        `"${fromName}" <${process.env.GMAIL_USER?.trim() || smtp.user}>`;
      const info = await transporter.sendMail({
        from,
        to: toList.join(", "),
        subject: input.subject,
        html: input.html,
        replyTo:
          input.replyTo ||
          process.env.EMAIL_REPLY_TO?.trim() ||
          process.env.GMAIL_USER?.trim() ||
          smtp.user,
      });
      return { ok: true, provider: "gmail", id: info.messageId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error SMTP";
      console.error("[email] SMTP falló:", msg);
      return { ok: false, error: msg };
    }
  }

  const resend = resendConfigured();
  if (resend) {
    const isTestFrom = /onboarding@resend\.dev/i.test(resend.from);
    if (isTestFrom) {
      console.warn(
        "[email] RESEND_FROM_EMAIL=onboarding@resend.dev solo entrega a correos verificados en Resend. Configura Brevo (SMTP_*) o Gmail App Password.",
      );
    }
    try {
      const client = new Resend(resend.apiKey);
      const result = await client.emails.send({
        from: resend.from,
        to: toList,
        subject: input.subject,
        html: input.html,
        replyTo: input.replyTo || process.env.EMAIL_REPLY_TO?.trim() || undefined,
      });
      if (result.error) {
        console.error("[email] Resend error:", result.error);
        return { ok: false, error: result.error.message || "Error Resend" };
      }
      return { ok: true, provider: "resend", id: result.data?.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error Resend";
      console.error("[email] Resend falló:", msg);
      return { ok: false, error: msg };
    }
  }

  return {
    ok: false,
    error:
      "Sin proveedor de correo. Define SMTP_USER + SMTP_PASS (Brevo) o GMAIL_APP_PASSWORD, o RESEND_API_KEY con dominio verificado.",
  };
}

export function describeEmailProvider(): {
  active: "gmail" | "resend" | "none";
  canSendToAnyRecipient: boolean;
  hint: string;
} {
  if (smtpConfigured()) {
    const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
    const viaBrevo = /brevo\.com|sendinblue\.com/i.test(host);
    return {
      active: "gmail",
      canSendToAnyRecipient: true,
      hint: viaBrevo
        ? "Brevo SMTP activo: puede confirmar pedidos a cualquier clienta."
        : "SMTP activo: puede confirmar pedidos a cualquier clienta.",
    };
  }
  const resend = resendConfigured();
  if (resend) {
    const test = /onboarding@resend\.dev/i.test(resend.from);
    return {
      active: "resend",
      canSendToAnyRecipient: !test,
      hint: test
        ? "Resend en modo prueba: no llega a clientas arbitrarias. Usa Brevo SMTP."
        : "Resend con from personalizado (dominio verificado).",
    };
  }
  return {
    active: "none",
    canSendToAnyRecipient: false,
    hint: "Falta configurar Brevo SMTP o Resend.",
  };
}
