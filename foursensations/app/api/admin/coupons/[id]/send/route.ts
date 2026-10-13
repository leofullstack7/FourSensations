import { CouponEmailSendStatus } from "@prisma/client";
import { requireAdminApiWithActor } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { prisma } from "@/lib/prisma";
import { couponTypeLabel } from "@/lib/coupons";
import { couponSendEmailSchema } from "@/lib/validation/coupons";
import { couponValueLabel, sendCouponGiftEmail } from "@/lib/server/email/coupon-mail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { denied, actor } = await requireAdminApiWithActor();
  if (denied) return denied;
  const { id } = await ctx.params;

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return noStoreJson({ error: "Cupón no encontrado" }, { status: 404 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = couponSendEmailSchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const storeUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://foursensations.onrender.com";

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const recipient of parsed.data.recipients) {
    const send = await sendCouponGiftEmail({
      to: recipient.email,
      toName: recipient.name,
      subject: parsed.data.subject,
      message: parsed.data.message,
      storeUrl,
      coupon: {
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        typeLabel: couponTypeLabel(coupon.type),
        valueLabel: couponValueLabel(coupon.type, coupon.value),
        endsAt: coupon.endsAt,
        theme: coupon.theme,
      },
    });

    await prisma.couponEmailSend.create({
      data: {
        couponId: coupon.id,
        toEmail: recipient.email.trim().toLowerCase(),
        toName: recipient.name?.trim() || null,
        subject: parsed.data.subject?.trim() || `Tu cupón ${coupon.code}`,
        status: send.ok ? CouponEmailSendStatus.SENT : CouponEmailSendStatus.FAILED,
        error: send.ok ? null : send.error,
        sentBy: actor,
      },
    });

    results.push(send.ok ? { email: recipient.email, ok: true } : { email: recipient.email, ok: false, error: send.error });
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  return noStoreJson({ ok: failed === 0, sent, failed, results });
}
