import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getEmailRuntimeConfig, type EmailRuntimeConfig } from "@/lib/server/email/runtime-config";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; provider: "brevo" | "smtp" | "resend"; id?: string }
  | { ok: false; error: string };

const DEFAULT_NOTIFY = "pedidosfoursensations@gmail.com";

export async function resolveStoreNotifyEmail(): Promise<string | null> {
  const cfg = await getEmailRuntimeConfig();
  const to = cfg.notifyEmail || DEFAULT_NOTIFY;
  return to.includes("@") ? to : null;
}

function resolveFrom(cfg: EmailRuntimeConfig): { email: string; name: string; header: string } {
  const name = cfg.emailFromName || "Four Sensations";
  const raw = cfg.emailFrom || DEFAULT_NOTIFY;
  const angle = raw.match(/^(.*?)<([^>]+)>$/);
  if (angle) {
    const email = angle[2]!.trim();
    const n = angle[1]!.trim().replace(/^["']|["']$/g, "") || name;
    return { email, name: n, header: `"${n}" <${email}>` };
  }
  if (raw.includes("@")) {
    return { email: raw, name, header: `"${name}" <${raw}>` };
  }
  return { email: DEFAULT_NOTIFY, name, header: `"${name}" <${DEFAULT_NOTIFY}>` };
}

async function sendViaBrevoApi(
  input: SendEmailInput,
  toList: string[],
  cfg: EmailRuntimeConfig,
): Promise<SendEmailResult> {
  const apiKey = cfg.brevoApiKey;
  if (!apiKey) return { ok: false, error: "Sin BREVO_API_KEY" };

  const from = resolveFrom(cfg);
  const replyTo = input.replyTo?.trim() || cfg.notifyEmail || from.email;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: from.name, email: from.email },
        to: toList.map((email) => ({ email })),
        replyTo: { email: replyTo },
        subject: input.subject,
        htmlContent: input.html,
      }),
    });

    const bodyText = await res.text();
    let body: { messageId?: string; message?: string } = {};
    try {
      body = bodyText ? (JSON.parse(bodyText) as typeof body) : {};
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      const msg = body.message || bodyText.slice(0, 300) || `Brevo HTTP ${res.status}`;
      console.error("[email] Brevo API error:", res.status, msg);
      return { ok: false, error: msg };
    }

    return { ok: true, provider: "brevo", id: body.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error Brevo API";
    console.error("[email] Brevo API falló:", msg);
    return { ok: false, error: msg };
  }
}

async function sendViaSmtp(
  input: SendEmailInput,
  toList: string[],
  cfg: EmailRuntimeConfig,
): Promise<SendEmailResult> {
  if (!cfg.smtpUser || !cfg.smtpPass) return { ok: false, error: "SMTP no configurado" };

  try {
    const host = cfg.smtpHost || "smtp-relay.brevo.com";
    const isBrevo = /brevo\.com|sendinblue\.com/i.test(host);
    const port = Number(cfg.smtpPort || (isBrevo ? "587" : "465"));
    const secureDefault = isBrevo || port === 587 ? "false" : "true";
    const secure = (cfg.smtpSecure || secureDefault) !== "false";
    const from = resolveFrom(cfg);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
    });
    const info = await transporter.sendMail({
      from: cfg.emailFrom || from.header,
      to: toList.join(", "),
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo || cfg.notifyEmail || from.email,
    });
    return { ok: true, provider: "smtp", id: info.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error SMTP";
    console.error("[email] SMTP falló:", msg);
    return { ok: false, error: msg };
  }
}

async function sendViaResend(input: SendEmailInput, toList: string[]): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "Resend no configurado" };
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  if (/onboarding@resend\.dev/i.test(from)) {
    console.warn("[email] Resend onboarding@ solo entrega a correos de prueba.");
  }

  try {
    const client = new Resend(apiKey);
    const result = await client.emails.send({
      from,
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

/** Orden: Brevo API → SMTP → Resend. Lee env y/o SiteSettings.emailConfig. */
export async function sendTransactionalEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const toList = (Array.isArray(input.to) ? input.to : [input.to]).map((t) => t.trim()).filter(Boolean);
  if (toList.length === 0) return { ok: false, error: "Destinatario vacío" };

  const cfg = await getEmailRuntimeConfig();
  const errors: string[] = [];

  if (cfg.brevoApiKey) {
    const r = await sendViaBrevoApi(input, toList, cfg);
    if (r.ok) {
      console.log("[email] enviado vía brevo →", toList.join(", "), "source=", cfg.source);
      return r;
    }
    errors.push(`brevo: ${r.error}`);
  }

  if (cfg.smtpUser && cfg.smtpPass) {
    const r = await sendViaSmtp(input, toList, cfg);
    if (r.ok) {
      console.log("[email] enviado vía smtp →", toList.join(", "), "source=", cfg.source);
      return r;
    }
    errors.push(`smtp: ${r.error}`);
  }

  if (process.env.RESEND_API_KEY?.trim()) {
    const r = await sendViaResend(input, toList);
    if (r.ok) return r;
    errors.push(`resend: ${r.error}`);
  }

  const error =
    errors.length > 0
      ? errors.join(" | ")
      : "Sin proveedor. Configura BREVO_API_KEY en Render o en Admin → Correos.";
  console.error("[email] todos los proveedores fallaron:", error, "source=", cfg.source);
  return { ok: false, error };
}

export async function describeEmailProvider(): Promise<{
  active: "brevo" | "smtp" | "resend" | "none";
  canSendToAnyRecipient: boolean;
  hint: string;
  notifyEmail: string | null;
  source: EmailRuntimeConfig["source"];
  hasBrevoKey: boolean;
}> {
  const cfg = await getEmailRuntimeConfig();
  const notifyEmail = cfg.notifyEmail;
  if (cfg.brevoApiKey) {
    return {
      active: "brevo",
      canSendToAnyRecipient: true,
      hint: `Brevo API activo (${cfg.source}).`,
      notifyEmail,
      source: cfg.source,
      hasBrevoKey: true,
    };
  }
  if (cfg.smtpUser && cfg.smtpPass) {
    return {
      active: "smtp",
      canSendToAnyRecipient: true,
      hint: `SMTP activo (${cfg.source}).`,
      notifyEmail,
      source: cfg.source,
      hasBrevoKey: false,
    };
  }
  if (process.env.RESEND_API_KEY?.trim()) {
    const test = /onboarding@resend\.dev/i.test(process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev");
    return {
      active: "resend",
      canSendToAnyRecipient: !test,
      hint: test
        ? "Resend en modo prueba. Configura BREVO_API_KEY."
        : "Resend con dominio verificado.",
      notifyEmail,
      source: cfg.source,
      hasBrevoKey: false,
    };
  }
  return {
    active: "none",
    canSendToAnyRecipient: false,
    hint: "Falta BREVO_API_KEY en Render o en SiteSettings.",
    notifyEmail,
    source: "none",
    hasBrevoKey: false,
  };
}
