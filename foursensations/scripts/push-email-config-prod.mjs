/**
 * Inyecta BREVO_API_KEY (y SMTP) en producción vía /api/setup/email
 * usando AUTH_SECRET del .env.local (debe coincidir con Render).
 *
 * Uso: node scripts/push-email-config-prod.mjs
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[m[1]] = v;
}

const base = process.env.PROD_URL || "https://foursensations.onrender.com";
const secret = env.AUTH_SECRET;
if (!secret) {
  console.error("Falta AUTH_SECRET en .env.local");
  process.exit(1);
}
if (!env.BREVO_API_KEY) {
  console.error("Falta BREVO_API_KEY en .env.local");
  process.exit(1);
}

const payload = {
  brevoApiKey: env.BREVO_API_KEY,
  smtpUser: env.SMTP_USER || undefined,
  smtpPass: env.SMTP_PASS || undefined,
  smtpHost: env.SMTP_HOST || "smtp-relay.brevo.com",
  emailFrom: env.EMAIL_FROM || "Four Sensations <pedidosfoursensations@gmail.com>",
  emailFromName: env.EMAIL_FROM_NAME || "Four Sensations",
  notifyEmail: env.RESEND_NOTIFY_EMAIL || env.GMAIL_USER || "pedidosfoursensations@gmail.com",
  sendTestTo: env.RESEND_NOTIFY_EMAIL || env.GMAIL_USER || "pedidosfoursensations@gmail.com",
};

const endpoints = [
  `${base}/api/admin/email-config`,
  `${base}/api/email-setup`,
  `${base}/api/setup/email`,
];

let ok = false;
for (const url of endpoints) {
  const method = url.includes("email-config") ? "PUT" : "POST";
  console.log(method, url);
  const body =
    method === "PUT"
      ? {
          brevoApiKey: payload.brevoApiKey,
          smtpUser: payload.smtpUser,
          smtpPass: payload.smtpPass,
          smtpHost: payload.smtpHost,
          emailFrom: payload.emailFrom,
          emailFromName: payload.emailFromName,
          notifyEmail: payload.notifyEmail,
        }
      : payload;

  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log("status=", res.status);
  console.log(text.slice(0, 500));
  if (res.ok) {
    ok = true;
    if (method === "PUT") {
      const test = await fetch(`${base}/api/admin/email-config`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ to: payload.sendTestTo }),
      });
      console.log("test status=", test.status, (await test.text()).slice(0, 400));
    }
    break;
  }
}

process.exit(ok ? 0 : 1);
