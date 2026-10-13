import { CouponStatus, CouponType } from "@prisma/client";
import { requireAdminApi, requireAdminApiWithActor } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode, couponTypeLabel, effectiveCouponStatus } from "@/lib/coupons";
import { couponUpsertSchema } from "@/lib/validation/coupons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ id: string }> };

function serializeCoupon(
  c: NonNullable<Awaited<ReturnType<typeof prisma.coupon.findUnique>>> & {
    _count: { redemptions: number; emailSends: number };
  },
) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    description: c.description,
    type: c.type,
    typeLabel: couponTypeLabel(c.type),
    value: c.value,
    minSubtotal: c.minSubtotal,
    maxDiscount: c.maxDiscount,
    startsAt: c.startsAt?.toISOString() ?? null,
    endsAt: c.endsAt?.toISOString() ?? null,
    usageLimit: c.usageLimit,
    perUserLimit: c.perUserLimit,
    status: c.status,
    effectiveStatus: effectiveCouponStatus(c),
    theme: c.theme,
    createdBy: c.createdBy,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    redemptionCount: c._count.redemptions,
    emailSendCount: c._count.emailSends,
    remaining:
      c.usageLimit == null ? null : Math.max(0, c.usageLimit - c._count.redemptions),
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      _count: { select: { redemptions: true, emailSends: true } },
      redemptions: {
        orderBy: { redeemedAt: "desc" },
        take: 100,
        select: {
          id: true,
          customerEmail: true,
          customerName: true,
          discountAmount: true,
          orderTotal: true,
          redeemedAt: true,
          orderId: true,
          order: { select: { reference: true } },
        },
      },
      emailSends: {
        orderBy: { sentAt: "desc" },
        take: 50,
        select: {
          id: true,
          toEmail: true,
          toName: true,
          subject: true,
          status: true,
          error: true,
          sentAt: true,
          sentBy: true,
        },
      },
    },
  });

  if (!coupon) return noStoreJson({ error: "Cupón no encontrado" }, { status: 404 });

  return noStoreJson({
    coupon: serializeCoupon(coupon),
    redemptions: coupon.redemptions.map((r) => ({
      ...r,
      redeemedAt: r.redeemedAt.toISOString(),
      orderReference: r.order.reference,
    })),
    emailSends: coupon.emailSends.map((s) => ({
      ...s,
      sentAt: s.sentAt.toISOString(),
    })),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { denied, actor } = await requireAdminApiWithActor();
  if (denied) return denied;
  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return noStoreJson({ error: "Cupón no encontrado" }, { status: 404 });

  // Partial status-only updates
  if (json && typeof json === "object" && "status" in json && Object.keys(json as object).length === 1) {
    const status = (json as { status: string }).status;
    if (!["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "ARCHIVED"].includes(status)) {
      return noStoreJson({ error: "Estado inválido" }, { status: 400 });
    }
    const coupon = await prisma.coupon.update({
      where: { id },
      data: { status: status as CouponStatus },
      include: { _count: { select: { redemptions: true, emailSends: true } } },
    });
    return noStoreJson({ coupon: serializeCoupon(coupon) });
  }

  const parsed = couponUpsertSchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const code = normalizeCouponCode(data.code);
  if (code !== existing.code) {
    const clash = await prisma.coupon.findUnique({ where: { code } });
    if (clash) return noStoreJson({ error: `Ya existe el código ${code}` }, { status: 409 });
  }

  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      code,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      type: data.type as CouponType,
      value: data.type === "FREE_SHIPPING" ? 0 : data.value,
      minSubtotal: data.minSubtotal ?? null,
      maxDiscount: data.maxDiscount ?? null,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      usageLimit: data.usageLimit ?? null,
      perUserLimit: data.perUserLimit ?? null,
      status: data.status as CouponStatus,
      theme: data.theme,
      createdBy: existing.createdBy ?? actor,
    },
    include: { _count: { select: { redemptions: true, emailSends: true } } },
  });

  return noStoreJson({ coupon: serializeCoupon(coupon) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await ctx.params;

  const existing = await prisma.coupon.findUnique({
    where: { id },
    include: { _count: { select: { redemptions: true } } },
  });
  if (!existing) return noStoreJson({ error: "Cupón no encontrado" }, { status: 404 });

  if (existing._count.redemptions > 0) {
    const coupon = await prisma.coupon.update({
      where: { id },
      data: { status: CouponStatus.ARCHIVED },
      include: { _count: { select: { redemptions: true, emailSends: true } } },
    });
    return noStoreJson({ coupon: serializeCoupon(coupon), archived: true });
  }

  await prisma.coupon.delete({ where: { id } });
  return noStoreJson({ ok: true, deleted: true });
}
