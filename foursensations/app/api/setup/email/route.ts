import { NextRequest, NextResponse } from "next/server";
import { mergeSiteSettingsData, getSiteSettingsData } from "@/lib/server/site-settings";
import {
  invalidateEmailRuntimeCache,
  normalizeSiteEmailConfig,
  type SiteEmailConfig,
} from "@/lib/server/email/runtime-config";
import { describeEmailProvider, sendTransactionalEmail } from "@/lib/server/email/send";

export const dynamic = "force-dynamic";

/**
 * Bootstrap de correos en producción (sin dashboard de Render).
 * Auth: Authorization: Bearer <AUTH_SECRET>  (el mismo AUTH_SECRET del servidor)
 * Body: { brevoApiKey, emailFrom?, notifyEmail?, smtpUser?, smtpPass?, sendTestTo? }
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.AUTH_SECRET?.trim();
  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const patch: SiteEmailConfig = {};
  if (typeof body.brevoApiKey === "string" && body.brevoApiKey.trim()) {
    patch.brevoApiKey = body.brevoApiKey.trim();
  }
  if (typeof body.smtpUser === "string" && body.smtpUser.trim()) patch.smtpUser = body.smtpUser.trim();
  if (typeof body.smtpPass === "string" && body.smtpPass.trim()) patch.smtpPass = body.smtpPass.trim();
  if (typeof body.smtpHost === "string" && body.smtpHost.trim()) patch.smtpHost = body.smtpHost.trim();
  if (typeof body.emailFrom === "string" && body.emailFrom.trim()) patch.emailFrom = body.emailFrom.trim();
  if (typeof body.emailFromName === "string" && body.emailFromName.trim()) {
    patch.emailFromName = body.emailFromName.trim();
  }
  if (typeof body.notifyEmail === "string" && body.notifyEmail.trim()) {
    patch.notifyEmail = body.notifyEmail.trim();
  }

  if (!patch.brevoApiKey && !patch.smtpPass) {
    return NextResponse.json({ error: "Envía brevoApiKey (recomendado) o smtpPass" }, { status: 400 });
  }

  const current = await getSiteSettingsData();
  const prev = normalizeSiteEmailConfig(current.emailConfig) || {};
  const next: SiteEmailConfig = {
    ...prev,
    ...patch,
    emailFrom: patch.emailFrom || prev.emailFrom || "Four Sensations <pedidosfoursensations@gmail.com>",
    emailFromName: patch.emailFromName || prev.emailFromName || "Four Sensations",
    notifyEmail: patch.notifyEmail || prev.notifyEmail || "pedidosfoursensations@gmail.com",
  };

  await mergeSiteSettingsData({ emailConfig: next });
  invalidateEmailRuntimeCache();

  const provider = await describeEmailProvider();
  let test: { ok: boolean; error?: string; id?: string; to?: string } | null = null;

  const sendTestTo =
    typeof body.sendTestTo === "string" && body.sendTestTo.includes("@")
      ? body.sendTestTo.trim()
      : next.notifyEmail;

  if (sendTestTo) {
    const r = await sendTransactionalEmail({
      to: sendTestTo,
      subject: "✦ Four Sensations — correos activados en producción",
      html: "<p>Configuración de correo guardada. Las confirmaciones de pedido ya pueden salir.</p>",
    });
    test = r.ok
      ? { ok: true, id: r.id, to: sendTestTo }
      : { ok: false, error: r.error, to: sendTestTo };
  }

  return NextResponse.json({
    ok: true,
    provider,
    hasBrevoKey: Boolean(next.brevoApiKey),
    notifyEmail: next.notifyEmail,
    test,
  });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.AUTH_SECRET?.trim();
  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const provider = await describeEmailProvider();
  return NextResponse.json({ provider });
}
