import { adminFetch } from "@/lib/api/admin-fetch";
export type AdminCoupon = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  typeLabel: string;
  value: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "ARCHIVED";
  effectiveStatus: string;
  theme: string;
  kind?: "WELCOME" | "CLASSIC" | string;
  assignedEmail?: string | null;
  assignedAt?: string | null;
  poolState?: "activo" | "libre" | "clasico" | string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  redemptionCount: number;
  emailSendCount: number;
  remaining: number | null;
};

export type AdminCouponStats = {
  total: number;
  active: number;
  free: number;
  classic?: number;
  redemptions: number;
  emails: number;
};

export type AdminCouponDetail = {
  coupon: AdminCoupon;
  redemptions: {
    id: string;
    customerEmail: string;
    customerName: string | null;
    discountAmount: number;
    orderTotal: number;
    redeemedAt: string;
    orderId: string;
    orderReference: string;
  }[];
  emailSends: {
    id: string;
    toEmail: string;
    toName: string | null;
    subject: string;
    status: string;
    error: string | null;
    sentAt: string;
    sentBy: string | null;
  }[];
};

export type CouponUpsertPayload = {
  code: string;
  name: string;
  description?: string | null;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  status: AdminCoupon["status"];
  theme: "rose" | "gold" | "violet" | "emerald" | "midnight";
};

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error || "Error en cupones");
  return data;
}

export async function fetchAdminCoupons(): Promise<{
  coupons: AdminCoupon[];
  stats: AdminCouponStats;
}> {
  const res = await adminFetch("/api/admin/coupons", { credentials: "same-origin", cache: "no-store" });
  return parseJson(res);
}

export type CreateCouponsBatchPayload =
  | { kind: "WELCOME"; quantity: number; value?: number }
  | {
      kind: "CLASSIC";
      code: string;
      name?: string;
      type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
      value: number;
      endsAt: string;
      perUserLimit?: number | null;
    };

export async function createAdminCouponsBatch(
  payload: CreateCouponsBatchPayload,
): Promise<{ ok: true; kind: string; created: number; codes?: string[]; code?: string }> {
  const res = await adminFetch("/api/admin/coupons/batch", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function fetchAdminCouponDetail(id: string): Promise<AdminCouponDetail> {
  const res = await adminFetch(`/api/admin/coupons/${id}`, { credentials: "same-origin", cache: "no-store" });
  return parseJson(res);
}

export async function createAdminCoupon(payload: CouponUpsertPayload): Promise<AdminCoupon> {
  const res = await adminFetch("/api/admin/coupons", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ coupon: AdminCoupon }>(res);
  return data.coupon;
}

export async function updateAdminCoupon(id: string, payload: CouponUpsertPayload | { status: AdminCoupon["status"] }): Promise<AdminCoupon> {
  const res = await adminFetch(`/api/admin/coupons/${id}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ coupon: AdminCoupon }>(res);
  return data.coupon;
}

export async function deleteAdminCoupon(id: string): Promise<void> {
  const res = await adminFetch(`/api/admin/coupons/${id}`, { method: "DELETE", credentials: "same-origin" });
  await parseJson(res);
}

export async function sendAdminCouponEmails(
  id: string,
  body: {
    recipients: { email: string; name?: string }[];
    subject?: string;
    message?: string;
  },
): Promise<{ sent: number; failed: number }> {
  const res = await adminFetch(`/api/admin/coupons/${id}/send`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}
