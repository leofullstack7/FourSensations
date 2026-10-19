import { CouponEmailSendStatus, CouponStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computeCouponDiscount,
  normalizeCouponCode,
  validateCouponForCart,
  type CouponDiscountInput,
} from "@/lib/coupons";
import { isWelcomeCouponCode } from "@/lib/server/welcome-coupon";

export async function findCouponByCode(code: string) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  return prisma.coupon.findUnique({ where: { code: normalized } });
}

export async function quoteCouponForCart(
  code: string,
  input: CouponDiscountInput,
): Promise<
  | { ok: true; couponId: string; code: string; discount: number; shippingAfter: number; label: string; name: string }
  | { ok: false; error: string }
> {
  const coupon = await findCouponByCode(code);
  if (!coupon) return { ok: false, error: "Cupón no encontrado" };

  const email = input.customerEmail?.trim().toLowerCase() || null;

  // Cupón inicial: solo el correo al que se envió puede redimirlo (con o sin sesión).
  if (isWelcomeCouponCode(coupon.code)) {
    if (!email) {
      return { ok: false, error: "Ingresa el correo al que te enviamos tu cupón de bienvenida." };
    }
    const gifted = await prisma.couponEmailSend.findFirst({
      where: {
        couponId: coupon.id,
        toEmail: { equals: email, mode: "insensitive" },
        status: CouponEmailSendStatus.SENT,
      },
      select: { id: true },
    });
    if (!gifted) {
      return {
        ok: false,
        error: "Este cupón está asociado a otro correo. Usa el mismo con el que lo reclamaste.",
      };
    }
  }

  const [redemptionCount, userRedemptionCount, pendingOrderCount] = await Promise.all([
    prisma.couponRedemption.count({ where: { couponId: coupon.id } }),
    email
      ? prisma.couponRedemption.count({
          where: { couponId: coupon.id, customerEmail: { equals: email, mode: "insensitive" } },
        })
      : Promise.resolve(0),
    prisma.order.count({
      where: {
        couponId: coupon.id,
        status: "PENDING_PAYMENT",
        paymentStatus: { in: ["PENDING", "PROCESSING"] },
      },
    }),
  ]);

  const result = validateCouponForCart(coupon, {
    ...input,
    redemptionCount,
    userRedemptionCount,
    pendingOrderCount,
  });

  if (!result.ok) return result;

  return {
    ok: true,
    couponId: result.coupon.id,
    code: result.coupon.code,
    discount: result.quote.discount,
    shippingAfter: result.quote.shippingAfter,
    label: result.quote.label,
    name: result.coupon.name,
  };
}

export async function recordCouponRedemptionForPaidOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      couponId: true,
      couponCode: true,
      discount: true,
      total: true,
      customerEmail: true,
      customerName: true,
      userId: true,
      paymentStatus: true,
      status: true,
      couponRedemption: { select: { id: true } },
    },
  });

  if (!order?.couponId || order.discount <= 0) return;
  if (order.couponRedemption) return;
  if (order.paymentStatus !== "APPROVED" || order.status !== "PAID") return;

  try {
    await prisma.couponRedemption.create({
      data: {
        couponId: order.couponId,
        orderId: order.id,
        userId: order.userId,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        discountAmount: order.discount,
        orderTotal: order.total,
      },
    });

    const coupon = await prisma.coupon.findUnique({
      where: { id: order.couponId },
      select: { usageLimit: true, endsAt: true, status: true, _count: { select: { redemptions: true } } },
    });
    if (coupon?.usageLimit != null && coupon._count.redemptions >= coupon.usageLimit) {
      await prisma.coupon.update({
        where: { id: order.couponId },
        data: { status: CouponStatus.EXPIRED },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return;
    }
    console.error("[coupons] recordCouponRedemptionForPaidOrder", e);
  }
}

export { computeCouponDiscount, normalizeCouponCode };
