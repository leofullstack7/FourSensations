import { CouponStatus, CouponType } from "@prisma/client";
import { requireAdminApi, requireAdminApiWithActor } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { prisma } from "@/lib/prisma";
import { normalizeCouponCode, couponTypeLabel, effectiveCouponStatus } from "@/lib/coupons";
import { couponUpsertSchema } from "@/lib/validation/coupons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function serializeCoupon(
  c: Awaited<ReturnType<typeof prisma.coupon.findMany>>[number] & {
    _count: { redemptions: number; emailSends: number };
  },
) {
  const status = effectiveCouponStatus(c);
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
    effectiveStatus: status,
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

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const rows = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true, emailSends: true } } },
  });

  const stats = {
    total: rows.length,
    active: rows.filter((r) => effectiveCouponStatus(r) === CouponStatus.ACTIVE).length,
    redemptions: rows.reduce((s, r) => s + r._count.redemptions, 0),
    emails: rows.reduce((s, r) => s + r._count.emailSends, 0),
  };

  return noStoreJson({ coupons: rows.map(serializeCoupon), stats });
}

export async function POST(req: Request) {
  const { denied, actor } = await requireAdminApiWithActor();
  if (denied) return denied;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = couponUpsertSchema.safeParse(json);
  if (!parsed.success) {
    return noStoreJson({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const code = normalizeCouponCode(data.code);
  if (code.length < 3) {
    return noStoreJson({ error: "Código demasiado corto" }, { status: 400 });
  }

  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) {
    return noStoreJson({ error: `Ya existe un cupón con el código ${code}` }, { status: 409 });
  }

  const coupon = await prisma.coupon.create({
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
      createdBy: actor,
    },
    include: { _count: { select: { redemptions: true, emailSends: true } } },
  });

  return noStoreJson({ coupon: serializeCoupon(coupon) }, { status: 201 });
}
