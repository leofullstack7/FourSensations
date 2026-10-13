import { CouponStatus, CouponType, type Coupon, type Prisma } from "@prisma/client";

export type CouponDiscountInput = {
  subtotal: number;
  shipping: number;
  customerEmail?: string | null;
};

export type CouponQuote = {
  discount: number;
  shippingAfter: number;
  label: string;
};

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function effectiveCouponStatus(coupon: Pick<Coupon, "status" | "startsAt" | "endsAt">, now = new Date()): CouponStatus {
  if (coupon.status === CouponStatus.ARCHIVED || coupon.status === CouponStatus.PAUSED || coupon.status === CouponStatus.DRAFT) {
    return coupon.status;
  }
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) {
    return CouponStatus.DRAFT;
  }
  if (coupon.endsAt && coupon.endsAt.getTime() < now.getTime()) {
    return CouponStatus.EXPIRED;
  }
  return coupon.status === CouponStatus.EXPIRED ? CouponStatus.EXPIRED : CouponStatus.ACTIVE;
}

export function computeCouponDiscount(
  coupon: Pick<Coupon, "type" | "value" | "maxDiscount" | "code" | "name">,
  input: CouponDiscountInput,
): CouponQuote {
  const subtotal = Math.max(0, Math.floor(input.subtotal));
  const shipping = Math.max(0, Math.floor(input.shipping));

  if (coupon.type === CouponType.FREE_SHIPPING) {
    return {
      discount: shipping,
      shippingAfter: 0,
      label: `Envío gratis · ${coupon.code}`,
    };
  }

  if (coupon.type === CouponType.PERCENT) {
    const pct = Math.min(100, Math.max(0, coupon.value));
    let discount = Math.floor((subtotal * pct) / 100);
    if (coupon.maxDiscount != null) {
      discount = Math.min(discount, Math.max(0, coupon.maxDiscount));
    }
    discount = Math.min(discount, subtotal);
    return {
      discount,
      shippingAfter: shipping,
      label: `${pct}% · ${coupon.code}`,
    };
  }

  // FIXED
  const discount = Math.min(Math.max(0, coupon.value), subtotal);
  return {
    discount,
    shippingAfter: shipping,
    label: `−$${discount.toLocaleString("es-CO")} · ${coupon.code}`,
  };
}

export type CouponValidationFailure =
  | { ok: false; error: string }
  | { ok: true; coupon: Coupon; quote: CouponQuote };

type CouponWithCounts = Coupon & {
  _count?: { redemptions: number };
  redemptions?: { id: string }[];
};

export function validateCouponForCart(
  coupon: CouponWithCounts | null,
  input: CouponDiscountInput & {
    redemptionCount: number;
    userRedemptionCount: number;
    pendingOrderCount?: number;
  },
  now = new Date(),
): CouponValidationFailure {
  if (!coupon) return { ok: false, error: "Cupón no encontrado" };

  const status = effectiveCouponStatus(coupon, now);
  if (status === CouponStatus.DRAFT) return { ok: false, error: "Este cupón aún no está activo" };
  if (status === CouponStatus.PAUSED) return { ok: false, error: "Este cupón está pausado" };
  if (status === CouponStatus.ARCHIVED) return { ok: false, error: "Este cupón ya no está disponible" };
  if (status === CouponStatus.EXPIRED) return { ok: false, error: "Este cupón expiró" };
  if (coupon.status !== CouponStatus.ACTIVE && status !== CouponStatus.ACTIVE) {
    return { ok: false, error: "Cupón no disponible" };
  }

  if (coupon.minSubtotal != null && input.subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      error: `Compra mínima de $${coupon.minSubtotal.toLocaleString("es-CO")} para usar este cupón`,
    };
  }

  const used = input.redemptionCount + (input.pendingOrderCount ?? 0);
  if (coupon.usageLimit != null && used >= coupon.usageLimit) {
    return { ok: false, error: "Este cupón agotó sus usos" };
  }

  if (
    coupon.perUserLimit != null &&
    input.customerEmail &&
    input.userRedemptionCount >= coupon.perUserLimit
  ) {
    return { ok: false, error: "Ya usaste este cupón el máximo de veces permitido" };
  }

  const quote = computeCouponDiscount(coupon, input);
  if (quote.discount <= 0 && coupon.type !== CouponType.FREE_SHIPPING) {
    return { ok: false, error: "El cupón no aplica a este carrito" };
  }
  if (coupon.type === CouponType.FREE_SHIPPING && input.shipping <= 0) {
    return { ok: false, error: "No hay costo de envío que bonificar" };
  }

  return { ok: true, coupon, quote };
}

export function couponTypeLabel(type: CouponType): string {
  switch (type) {
    case CouponType.PERCENT:
      return "% descuento";
    case CouponType.FIXED:
      return "Monto fijo";
    case CouponType.FREE_SHIPPING:
      return "Envío gratis";
    default:
      return type;
  }
}

export function couponStatusLabel(status: CouponStatus): string {
  switch (status) {
    case CouponStatus.DRAFT:
      return "Borrador";
    case CouponStatus.ACTIVE:
      return "Activo";
    case CouponStatus.PAUSED:
      return "Pausado";
    case CouponStatus.EXPIRED:
      return "Expirado";
    case CouponStatus.ARCHIVED:
      return "Archivado";
    default:
      return status;
  }
}

export type CouponCreateData = Prisma.CouponCreateInput;
