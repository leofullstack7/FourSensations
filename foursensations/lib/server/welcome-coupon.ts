import { CouponEmailSendStatus, CouponStatus, CouponType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { couponTypeLabel, normalizeCouponCode } from "@/lib/coupons";
import { couponValueLabel, sendWelcomeCouponEmail } from "@/lib/server/email/coupon-mail";
import { upsertWelcomeLead } from "@/lib/server/welcome-lead";
import { ensureStoreSchemaExtras } from "@/lib/server/ensure-schema";

export const WELCOME_COUPON_PERCENT = 10;

export function isWelcomeCouponKind(kind: string | null | undefined): boolean {
  return (kind || "").toUpperCase() === "WELCOME";
}

/** @deprecated prefer kind WELCOME */
export function isWelcomeCouponCode(code: string | null | undefined): boolean {
  const c = normalizeCouponCode(code || "");
  return c === "BIENVENIDA" || /^F\d{4}[A-Z]$/.test(c);
}

export async function claimWelcomeCoupon(
  rawEmail: string,
  rawWhatsapp: string,
): Promise<
  | { ok: true; alreadySent: true; message: string }
  | {
      ok: true;
      alreadySent: false;
      code: string;
      name: string;
      valueLabel: string;
      message: string;
    }
  | { ok: false; error: string }
> {
  await ensureStoreSchemaExtras();
  const email = rawEmail.trim().toLowerCase();
  const whatsappDigits = rawWhatsapp.replace(/\D/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Ingresa un correo electrónico válido." };
  }
  if (whatsappDigits.length < 10) {
    return { ok: false, error: "Ingresa un WhatsApp válido (mínimo 10 dígitos)." };
  }

  const alreadyAssigned = await prisma.coupon.findFirst({
    where: {
      kind: "WELCOME",
      assignedEmail: { equals: email, mode: "insensitive" },
      status: { in: [CouponStatus.ACTIVE, CouponStatus.PAUSED] },
    },
  });
  if (alreadyAssigned) {
    await upsertWelcomeLead(email, whatsappDigits).catch(() => undefined);
    return {
      ok: true,
      alreadySent: true,
      message: "Ya te enviamos tu primer cupón a tu correo electrónico anteriormente.",
    };
  }

  const priorSend = await prisma.couponEmailSend.findFirst({
    where: {
      toEmail: { equals: email, mode: "insensitive" },
      status: CouponEmailSendStatus.SENT,
      coupon: { kind: "WELCOME" },
    },
  });
  if (priorSend) {
    await upsertWelcomeLead(email, whatsappDigits).catch(() => undefined);
    return {
      ok: true,
      alreadySent: true,
      message: "Ya te enviamos tu primer cupón a tu correo electrónico anteriormente.",
    };
  }

  const free = await prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findFirst({
      where: {
        kind: "WELCOME",
        status: CouponStatus.ACTIVE,
        assignedEmail: null,
      },
      orderBy: { createdAt: "asc" },
    });
    if (!coupon) return null;
    return tx.coupon.update({
      where: { id: coupon.id },
      data: {
        assignedEmail: email,
        assignedAt: new Date(),
      },
    });
  });

  if (!free) {
    return {
      ok: false,
      error: "Por ahora no hay cupones iniciales disponibles. Intenta de nuevo en un momento.",
    };
  }

  const storeUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://foursensations.onrender.com";

  const valueLabel = couponValueLabel(free.type, free.value);
  const subject = "Girl, ¡tu cupón de bienvenida ya va en camino! 🎀";
  const send = await sendWelcomeCouponEmail({
    to: email,
    storeUrl,
    coupon: {
      code: free.code,
      valueLabel,
      percent: free.type === CouponType.PERCENT ? free.value : WELCOME_COUPON_PERCENT,
    },
  });

  await prisma.couponEmailSend.create({
    data: {
      couponId: free.id,
      toEmail: email,
      subject,
      status: send.ok ? CouponEmailSendStatus.SENT : CouponEmailSendStatus.FAILED,
      error: send.ok ? null : send.error,
      sentBy: "welcome-popup",
    },
  });

  if (!send.ok) {
    // Liberar el cupón si falló el correo
    await prisma.coupon.update({
      where: { id: free.id },
      data: { assignedEmail: null, assignedAt: null },
    });
    return { ok: false, error: send.error || "No pudimos enviar el correo. Intenta de nuevo." };
  }

  await upsertWelcomeLead(email, whatsappDigits).catch((e) => {
    console.error("[welcome-lead]", e);
  });

  return {
    ok: true,
    alreadySent: false,
    code: free.code,
    name: free.name,
    valueLabel,
    message: "Revisa tu correo electrónico: tu cupón ya va en camino.",
  };
}

export { couponTypeLabel };
