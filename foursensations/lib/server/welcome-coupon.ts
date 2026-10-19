import { CouponEmailSendStatus, CouponStatus, CouponType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { couponTypeLabel, normalizeCouponCode } from "@/lib/coupons";
import { couponValueLabel, sendCouponGiftEmail } from "@/lib/server/email/coupon-mail";
import { upsertWelcomeLead } from "@/lib/server/welcome-lead";

export const WELCOME_COUPON_CODE = "BIENVENIDA";
export const WELCOME_COUPON_PERCENT = 10;

export async function ensureWelcomeCoupon() {
  const code = normalizeCouponCode(WELCOME_COUPON_CODE);
  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) {
    if (existing.status !== CouponStatus.ACTIVE) {
      return prisma.coupon.update({
        where: { id: existing.id },
        data: { status: CouponStatus.ACTIVE },
      });
    }
    return existing;
  }

  return prisma.coupon.create({
    data: {
      code,
      name: "Cupón inicial",
      description:
        "Un detalle de bienvenida para tu primera compra en Four Sensations. Úsalo en el checkout con el correo al que te lo enviamos.",
      type: CouponType.PERCENT,
      value: WELCOME_COUPON_PERCENT,
      perUserLimit: 1,
      status: CouponStatus.ACTIVE,
      theme: "rose",
    },
  });
}

export function isWelcomeCouponCode(code: string | null | undefined): boolean {
  return normalizeCouponCode(code || "") === WELCOME_COUPON_CODE;
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
  const email = rawEmail.trim().toLowerCase();
  const whatsappDigits = rawWhatsapp.replace(/\D/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Ingresa un correo electrónico válido." };
  }
  if (whatsappDigits.length < 10) {
    return { ok: false, error: "Ingresa un WhatsApp válido (mínimo 10 dígitos)." };
  }

  const coupon = await ensureWelcomeCoupon();

  const prior = await prisma.couponEmailSend.findFirst({
    where: {
      couponId: coupon.id,
      toEmail: { equals: email, mode: "insensitive" },
      status: CouponEmailSendStatus.SENT,
    },
    orderBy: { sentAt: "desc" },
  });

  if (prior) {
    await upsertWelcomeLead(email, whatsappDigits).catch(() => undefined);
    return {
      ok: true,
      alreadySent: true,
      message: "Ya te enviamos tu primer cupón a tu correo electrónico anteriormente.",
    };
  }

  const storeUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://foursensations.onrender.com";

  const valueLabel = couponValueLabel(coupon.type, coupon.value);
  const subject = "Tu cupón de bienvenida en Four Sensations te espera ✨";
  const message =
    "Qué alegría tenerte en El Club de los Cabellos Perfectos. Preparamos un detalle especial para tu primera compra: un cupón pensado para que tu ritual empiece con una sonrisa. Guarda el código y úsalo en el checkout — con o sin iniciar sesión — usando este mismo correo.";

  const send = await sendCouponGiftEmail({
    to: email,
    subject,
    message,
    storeUrl,
    coupon: {
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      typeLabel: couponTypeLabel(coupon.type),
      valueLabel,
      endsAt: coupon.endsAt,
      theme: coupon.theme,
    },
  });

  await prisma.couponEmailSend.create({
    data: {
      couponId: coupon.id,
      toEmail: email,
      subject,
      status: send.ok ? CouponEmailSendStatus.SENT : CouponEmailSendStatus.FAILED,
      error: send.ok ? null : send.error,
      sentBy: "welcome-popup",
    },
  });

  if (!send.ok) {
    return { ok: false, error: send.error || "No pudimos enviar el correo. Intenta de nuevo en un momento." };
  }

  await upsertWelcomeLead(email, whatsappDigits).catch((e) => {
    console.error("[welcome-lead]", e);
  });

  return {
    ok: true,
    alreadySent: false,
    code: coupon.code,
    name: coupon.name,
    valueLabel,
    message: "Listo. Revisamos tu bandeja (y spam) — tu cupón ya va en camino.",
  };
}
