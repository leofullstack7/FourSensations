import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { mergeSiteSettingsData } from "@/lib/server/site-settings";
import {
  getEmailRuntimeConfig,
  invalidateEmailRuntimeCache,
  normalizeSiteEmailConfig,
  type SiteEmailConfig,
} from "@/lib/server/email/runtime-config";
import { describeEmailProvider, sendTransactionalEmail } from "@/lib/server/email/send";

export const dynamic = "force-dynamic";

/** Admin JWT o Bearer AUTH_SECRET (bootstrap desde CI/local). */
async function requireEmailAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.AUTH_SECRET?.trim();
  if (expected && token && token === expected) return null;
  return requireAdminApi();
}

function publicEmailConfig(cfg: SiteEmailConfig | null) {
  return {
    hasBrevoApiKey: Boolean(cfg?.brevoApiKey),
    brevoApiKeyPreview: cfg?.brevoApiKey ? `${cfg.brevoApiKey.slice(0, 12)}…` : null,
    hasSmtpPass: Boolean(cfg?.smtpPass),
    smtpUser: cfg?.smtpUser ?? null,
    smtpHost: cfg?.smtpHost ?? null,
    emailFrom: cfg?.emailFrom ?? null,
    emailFromName: cfg?.emailFromName ?? null,
    notifyEmail: cfg?.notifyEmail ?? null,
  };
}

export async function GET(req: NextRequest) {
  const denied = await requireEmailAdmin(req);
  if (denied) return denied;

  const runtime = await getEmailRuntimeConfig(true);
  const provider = await describeEmailProvider();
  const { getSiteSettingsData } = await import("@/lib/server/site-settings");
  const data = await getSiteSettingsData();
  const stored = normalizeSiteEmailConfig(data.emailConfig);

  return NextResponse.json({
    provider,
    runtime: {
      source: runtime.source,
      hasBrevoKey: Boolean(runtime.brevoApiKey),
      notifyEmail: runtime.notifyEmail,
      emailFrom: runtime.emailFrom,
    },
    stored: publicEmailConfig(stored),
  });
}

export async function PUT(req: NextRequest) {
  const denied = await requireEmailAdmin(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const patch: SiteEmailConfig = {};

  if (typeof rec.brevoApiKey === "string" && rec.brevoApiKey.trim()) {
    patch.brevoApiKey = rec.brevoApiKey.trim();
  }
  if (typeof rec.smtpUser === "string") patch.smtpUser = rec.smtpUser.trim();
  if (typeof rec.smtpPass === "string" && rec.smtpPass.trim()) patch.smtpPass = rec.smtpPass.trim();
  if (typeof rec.smtpHost === "string") patch.smtpHost = rec.smtpHost.trim();
  if (typeof rec.emailFrom === "string") patch.emailFrom = rec.emailFrom.trim();
  if (typeof rec.emailFromName === "string") patch.emailFromName = rec.emailFromName.trim();
  if (typeof rec.notifyEmail === "string") patch.notifyEmail = rec.notifyEmail.trim();

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que guardar" }, { status: 400 });
  }

  const { getSiteSettingsData } = await import("@/lib/server/site-settings");
  const current = await getSiteSettingsData();
  const prev = normalizeSiteEmailConfig(current.emailConfig) || {};
  const next: SiteEmailConfig = { ...prev, ...patch };

  await mergeSiteSettingsData({ emailConfig: next });
  invalidateEmailRuntimeCache();

  const provider = await describeEmailProvider();
  return NextResponse.json({
    ok: true,
    provider,
    stored: publicEmailConfig(next),
  });
}

/** Prueba de envío (admin). Body: { to?: string } */
export async function POST(req: NextRequest) {
  const denied = await requireEmailAdmin(req);
  if (denied) return denied;

  let to = "";
  try {
    const body = (await req.json()) as { to?: string };
    if (typeof body.to === "string") to = body.to.trim();
  } catch {
    /* empty */
  }

  const runtime = await getEmailRuntimeConfig(true);
  to = to || runtime.notifyEmail || "pedidosfoursensations@gmail.com";

  const result = await sendTransactionalEmail({
    to,
    subject: "✦ Prueba Four Sensations — correo OK",
    html: `<p>Si ves este mensaje, los correos de pedido ya pueden salir a clientas y a la tienda.</p><p>Fuente: <strong>${runtime.source}</strong></p>`,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, runtimeSource: runtime.source }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    to,
    provider: result.provider,
    id: result.id,
    runtimeSource: runtime.source,
  });
}
