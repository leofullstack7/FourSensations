import { CouponEmailSendStatus } from "@prisma/client";
import { auth } from "@/auth";
import { noStoreJson } from "@/lib/server/no-store-json";
import { prisma } from "@/lib/prisma";
import { couponTypeLabel } from "@/lib/coupons";
import { couponValueLabel } from "@/lib/server/email/coupon-mail";
import { isWelcomeCouponCode } from "@/lib/server/welcome-coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  const role = session?.user?.role;
  if (!email || (role !== "CUSTOMER" && role !== "ADMIN")) {
    return noStoreJson({ error: "Inicia sesión para ver tus cupones." }, { status: 401 });
  }

  try {
    const [sends, redemptions] = await Promise.all([
      prisma.couponEmailSend.findMany({
        where: {
          toEmail: { equals: email, mode: "insensitive" },
          status: CouponEmailSendStatus.SENT,
        },
        include: { coupon: true },
        orderBy: { sentAt: "desc" },
      }),
      prisma.couponRedemption.findMany({
        where: { customerEmail: { equals: email, mode: "insensitive" } },
        select: { couponId: true, redeemedAt: true },
      }),
    ]);

    const redeemedByCoupon = new Map(redemptions.map((r) => [r.couponId, r.redeemedAt]));
    const seenCoupon = new Set<string>();
    const coupons = [];

    for (const send of sends) {
      if (seenCoupon.has(send.couponId)) continue;
      seenCoupon.add(send.couponId);
      const c = send.coupon;
      const redeemedAt = redeemedByCoupon.get(c.id) ?? null;
      const welcome = isWelcomeCouponCode(c.code);
      coupons.push({
        id: c.id,
        code: c.code,
        name: c.name,
        reference: welcome ? "Cupón inicial" : c.name,
        description: c.description,
        valueLabel: couponValueLabel(c.type, c.value),
        typeLabel: couponTypeLabel(c.type),
        status: redeemedAt ? "Ya Redimido" : "Listo para redimir",
        redeemed: Boolean(redeemedAt),
        sentAt: send.sentAt.toISOString(),
        endsAt: c.endsAt?.toISOString() ?? null,
      });
    }

    return noStoreJson({ coupons });
  } catch (e) {
    console.error("[GET /api/store/coupons/mine]", e);
    return noStoreJson({ error: "No se pudieron cargar tus cupones." }, { status: 500 });
  }
}
