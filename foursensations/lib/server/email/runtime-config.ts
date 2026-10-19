import { getSiteSettingsData } from "@/lib/server/site-settings";

export type EmailRuntimeConfig = {
  brevoApiKey: string | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpHost: string | null;
  smtpPort: string | null;
  smtpSecure: string | null;
  emailFrom: string | null;
  emailFromName: string | null;
  notifyEmail: string | null;
  source: "env" | "site-settings" | "mixed" | "none";
};

export type SiteEmailConfig = {
  brevoApiKey?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpSecure?: string;
  emailFrom?: string;
  emailFromName?: string;
  notifyEmail?: string;
};

const DEFAULT_NOTIFY = "pedidosfoursensations@gmail.com";
const DEFAULT_FROM = "Four Sensations <pedidosfoursensations@gmail.com>";

let cache: { at: number; value: EmailRuntimeConfig } | null = null;
const CACHE_MS = 30_000;

function pick(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    const t = typeof v === "string" ? v.trim() : "";
    if (t) return t;
  }
  return null;
}

export function normalizeSiteEmailConfig(raw: unknown): SiteEmailConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: SiteEmailConfig = {};
  for (const key of [
    "brevoApiKey",
    "smtpUser",
    "smtpPass",
    "smtpHost",
    "smtpPort",
    "smtpSecure",
    "emailFrom",
    "emailFromName",
    "notifyEmail",
  ] as const) {
    const v = r[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return Object.keys(out).length ? out : null;
}

export function invalidateEmailRuntimeCache() {
  cache = null;
}

export async function getEmailRuntimeConfig(force = false): Promise<EmailRuntimeConfig> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  let site: SiteEmailConfig | null = null;
  try {
    const data = await getSiteSettingsData();
    site = normalizeSiteEmailConfig(data.emailConfig);
  } catch (e) {
    console.warn("[email] no se pudo leer emailConfig de SiteSettings:", e);
  }

  const envKey = process.env.BREVO_API_KEY?.trim() || null;
  const siteKey = site?.brevoApiKey?.trim() || null;
  const smtpUser = pick(process.env.SMTP_USER, process.env.GMAIL_USER, site?.smtpUser);
  const smtpPass = pick(process.env.SMTP_PASS, process.env.GMAIL_APP_PASSWORD, site?.smtpPass);

  const hasEnv = Boolean(envKey || (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()));
  const hasSite = Boolean(siteKey || (site?.smtpUser && site?.smtpPass));

  const value: EmailRuntimeConfig = {
    brevoApiKey: pick(envKey, siteKey),
    smtpUser,
    smtpPass,
    smtpHost: pick(process.env.SMTP_HOST, site?.smtpHost, "smtp-relay.brevo.com"),
    smtpPort: pick(process.env.SMTP_PORT, site?.smtpPort, "587"),
    smtpSecure: pick(process.env.SMTP_SECURE, site?.smtpSecure, "false"),
    emailFrom: pick(process.env.EMAIL_FROM, site?.emailFrom, DEFAULT_FROM),
    emailFromName: pick(process.env.EMAIL_FROM_NAME, site?.emailFromName, "Four Sensations"),
    notifyEmail: pick(
      process.env.RESEND_NOTIFY_EMAIL,
      process.env.EMAIL_REPLY_TO,
      process.env.GMAIL_USER,
      site?.notifyEmail,
      DEFAULT_NOTIFY,
    ),
    source: hasEnv && hasSite ? "mixed" : hasEnv ? "env" : hasSite ? "site-settings" : "none",
  };

  cache = { at: Date.now(), value };
  return value;
}
