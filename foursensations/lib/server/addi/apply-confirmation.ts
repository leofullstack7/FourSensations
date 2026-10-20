import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderEmailsOnce } from "@/lib/server/email/order-email-once";
import { recordCouponRedemptionForPaidOrder } from "@/lib/server/coupons";

export type AddiWebhookPayload = {
  orderId?: string;
  status?: string;
  applicationId?: string;
  [key: string]: unknown;
};

function mapAddiStatus(status: string): { payment: PaymentStatus; order: OrderStatus; approved: boolean } {
  const s = status.trim().toUpperCase();
  if (s === "APPROVED" || s === "COMPLETED") {
    return { payment: PaymentStatus.APPROVED, order: OrderStatus.PAID, approved: true };
  }
  if (s === "PENDING" || s === "IN_REVIEW" || s === "PROCESSING") {
    return { payment: PaymentStatus.PROCESSING, order: OrderStatus.PENDING_PAYMENT, approved: false };
  }
  if (s === "REJECTED" || s === "DECLINED" || s === "ABANDONED" || s === "CANCELLED" || s === "EXPIRED") {
    return { payment: PaymentStatus.DECLINED, order: OrderStatus.FAILED, approved: false };
  }
  return { payment: PaymentStatus.PENDING, order: OrderStatus.PENDING_PAYMENT, approved: false };
}

export async function applyAddiWebhook(
  payload: AddiWebhookPayload,
): Promise<{ ok: true; duplicate: boolean; orderReference: string | null } | { ok: false; error: string }> {
  const reference = String(payload.orderId || "").trim();
  const status = String(payload.status || "").trim();
  if (!reference || !status) {
    return { ok: true, duplicate: false, orderReference: null };
  }

  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true },
  });
  if (!order) {
    console.warn("[addi] pedido no encontrado", { reference, status });
    return { ok: true, duplicate: false, orderReference: null };
  }

  const mapped = mapAddiStatus(status);
  const jsonPayload = payload as unknown as Prisma.InputJsonValue;
  const txId = payload.applicationId ? String(payload.applicationId) : `addi-${reference}-${status}`;

  if (order.paymentStatus === PaymentStatus.APPROVED && order.status === OrderStatus.PAID) {
    await prisma.order.update({
      where: { id: order.id },
      data: { confirmationData: jsonPayload, updatedAt: new Date() },
    });
    return { ok: true, duplicate: true, orderReference: order.reference };
  }

  if (mapped.approved) {
    let firstApproval = false;
    try {
      firstApproval = await prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        if (!current) throw new Error("Pedido desapareció");
        if (current.paymentStatus === PaymentStatus.APPROVED && current.status === OrderStatus.PAID) {
          return false;
        }
        for (const line of current.items) {
          if (!line.productId) continue;
          const p = await tx.product.findUnique({ where: { id: line.productId }, select: { stock: true } });
          if (!p) continue;
          await tx.product.update({
            where: { id: line.productId },
            data: { stock: Math.max(0, p.stock - line.quantity) },
          });
        }
        await tx.order.update({
          where: { id: current.id },
          data: {
            status: mapped.order,
            paymentStatus: mapped.payment,
            paymentProvider: "ADDI",
            providerTransactionId: txId,
            confirmationData: jsonPayload,
          },
        });
        return true;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error en transacción Addi";
      console.error("[addi] error aprobando pedido", msg);
      return { ok: false, error: msg };
    }

    if (!firstApproval) {
      return { ok: true, duplicate: true, orderReference: order.reference };
    }
    void sendOrderEmailsOnce(order.id).catch((err) => console.error("[email] addi once", err));
    void recordCouponRedemptionForPaidOrder(order.id).catch((err) =>
      console.error("[coupons] error registrando canje:", err),
    );
    return { ok: true, duplicate: false, orderReference: order.reference };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: mapped.order,
      paymentStatus: mapped.payment,
      paymentProvider: "ADDI",
      providerTransactionId: txId,
      confirmationData: jsonPayload,
    },
  });

  return { ok: true, duplicate: false, orderReference: order.reference };
}
