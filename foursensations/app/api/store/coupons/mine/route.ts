import { CouponEmailSendStatus } from "@prisma/client";
import { auth } from "@/auth";
import { noStoreJson } from "@/lib/server/no-store-json";
import { prisma } from "@/lib/prisma";
import { couponTypeLabel } from "@/lib/coupons";
import { couponValueLabel } from "@/lib/server/email/coupon-mail";
import { isWelcomeCouponKind } from "@/lib/server/welcome-coupon";
import { ensureStoreSchemaExtras } from "@/lib/server/ensure-schema";

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
    await ensureStoreSchemaExtras();

    const [sends, assignedWelcome, redemptions] = await Promise.all([
      prisma.couponEmailSend.findMany({
        where: {
          toEmail: { equals: email, mode: "insensitive" },
          status: CouponEmailSendStatus.SENT,
        },
        include: { coupon: true },
        orderBy: { sentAt: "desc" },
      }),
      prisma.coupon.findMany({
        where: {
          kind: "WELCOME",
          assignedEmail: { equals: email, mode: "insensitive" },
        },
      }),
      prisma.couponRedemption.findMany({
        where: { customerEmail: { equals: email, mode: "insensitive" } },
        select: { couponId: true, redeemedAt: true },
      }),
    ]);

    const redeemedByCoupon = new Map(redemptions.map((r) => [r.couponId, r.redeemedAt]));
    const seenCoupon = new Set<string>();
    type MineCoupon = {
      id: string;
      code: string;
      name: string;
      kind: string;
      reference: string;
      description: string | null;
      valueLabel: string;
      typeLabel: string;
      status: string;
      redeemed: boolean;
      sentAt: string | null;
      endsAt: string | null;
    };
    const coupons: MineCoupon[] = [];

    const pushCoupon = (
      c: (typeof sends)[number]["coupon"],
      sentAt: Date | null,
    ) => {
      if (seenCoupon.has(c.id)) return;
      seenCoupon.add(c.id);
      const redeemedAt = redeemedByCoupon.get(c.id) ?? null;
      const welcome = isWelcomeCouponKind(c.kind) || c.code === "BIENVENIDA";
      coupons.push({
        id: c.id,
        code: c.code,
        name: c.name,
        kind: (c.kind || "CLASSIC").toUpperCase(),
        reference: welcome ? "Cupón inicial" : c.name,
        description: c.description,
        valueLabel: couponValueLabel(c.type, c.value),
        typeLabel: couponTypeLabel(c.type),
        status: redeemedAt ? "Ya Redimido" : "Listo para redimir",
        redeemed: Boolean(redeemedAt),
        sentAt: sentAt?.toISOString() ?? null,
        endsAt: c.endsAt?.toISOString() ?? null,
      });
    };

    for (const send of sends) {
      pushCoupon(send.coupon, send.sentAt);
    }
    for (const c of assignedWelcome) {
      pushCoupon(c, (c as { assignedAt?: Date | null }).assignedAt ?? c.createdAt);
    }

    return noStoreJson({ coupons });
  } catch (e) {
    console.error("[GET /api/store/coupons/mine]", e);
    return noStoreJson({ error: "No se pudieron cargar tus cupones." }, { status: 500 });
  }
}
