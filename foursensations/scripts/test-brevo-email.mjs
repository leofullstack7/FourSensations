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

const apiKey = env.BREVO_API_KEY;
const fromEmail =
  (env.EMAIL_FROM || "").match(/<([^>]+)>/)?.[1] ||
  env.GMAIL_USER ||
  "pedidosfoursensations@gmail.com";
const to = env.RESEND_NOTIFY_EMAIL || fromEmail;

console.log("from=", fromEmail);
console.log("to=", to);
console.log("keyLen=", apiKey?.length ?? 0);

if (!apiKey) {
  console.error("Falta BREVO_API_KEY");
  process.exit(1);
}

const res = await fetch("https://api.brevo.com/v3/smtp/email", {
  method: "POST",
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    "api-key": apiKey,
  },
  body: JSON.stringify({
    sender: { name: "Four Sensations", email: fromEmail },
    to: [{ email: to }],
    subject: "Prueba Four Sensations — Brevo API",
    htmlContent: "<p>Correo de prueba: si ves esto, Brevo API funciona y los pedidos podrán confirmarse.</p>",
  }),
});

const text = await res.text();
console.log("status=", res.status);
console.log("body=", text.slice(0, 500));
process.exit(res.ok ? 0 : 1);
