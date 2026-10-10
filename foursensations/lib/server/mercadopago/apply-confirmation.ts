import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildCustomerOrderConfirmationPayload,
  sendOrderConfirmationToCustomer,
} from "@/lib/server/email/order-confirmation-customer";
import { orderPayloadForEmail, sendOrderNotification } from "@/lib/server/email/order-notification";
import type { MercadoPagoPayment } from "@/lib/server/mercadopago/client";

function mapMpStatus(status: string): { payment: PaymentStatus; order: OrderStatus } {
  switch (status) {
    case "approved":
      return { payment: PaymentStatus.APPROVED, order: OrderStatus.PAID };
    case "in_process":
    case "pending":
    case "authorized":
      return { payment: PaymentStatus.PROCESSING, order: OrderStatus.PENDING_PAYMENT };
    case "rejected":
    case "cancelled":
      return { payment: PaymentStatus.DECLINED, order: OrderStatus.FAILED };
    case "expired":
      return { payment: PaymentStatus.EXPIRED, order: OrderStatus.FAILED };
    default:
      return { payment: PaymentStatus.PENDING, order: OrderStatus.PENDING_PAYMENT };
  }
}

export async function applyMercadoPagoPayment(
  payment: MercadoPagoPayment,
): Promise<{ ok: true; duplicate: boolean; orderReference: string | null } | { ok: false; error: string }> {
  const reference = payment.external_reference?.trim();
  const metaId =
    payment.metadata && typeof payment.metadata.orderId === "string" ? payment.metadata.orderId.trim() : "";

  const order = reference
    ? await prisma.order.findUnique({ where: { reference }, include: { items: true } })
    : metaId
      ? await prisma.order.findUnique({ where: { id: metaId }, include: { items: true } })
      : null;

  if (!order) {
    console.warn("[mercadopago] pedido no encontrado", { reference, metaId, paymentId: payment.id });
    return { ok: true, duplicate: false, orderReference: null };
  }

  const txId = String(payment.id);
  const jsonPayload = payment as unknown as Prisma.InputJsonValue;
  const mapped = mapMpStatus(payment.status);

  if (payment.status === "approved") {
    const paidAmount = Math.round(Number(payment.transaction_amount ?? 0));
    if (Number.isFinite(paidAmount) && Math.abs(paidAmount - order.total) > 1) {
      console.error("[mercadopago] monto no coincide", {
        orderId: order.id,
        expected: order.total,
        paidAmount,
      });
      return { ok: false, error: "Monto inválido" };
    }
  }

  if (order.paymentStatus === PaymentStatus.APPROVED && order.status === OrderStatus.PAID) {
    await prisma.order.update({
      where: { id: order.id },
      data: { confirmationData: jsonPayload, updatedAt: new Date() },
    });
    return { ok: true, duplicate: true, orderReference: order.reference };
  }

  if (payment.status === "approved") {
    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        if (!current) throw new Error("Pedido desapareció");
        if (current.paymentStatus === PaymentStatus.APPROVED && current.status === OrderStatus.PAID) {
          return;
        }
        for (const line of current.items) {
          if (!line.productId) continue;
          const p = await tx.product.findUnique({ where: { id: line.productId } });
          if (!p || p.stock < line.quantity) {
            throw new Error(`Stock insuficiente para ${line.name}`);
          }
        }
        for (const line of current.items) {
          if (!line.productId) continue;
          await tx.product.update({
            where: { id: line.productId },
            data: { stock: { decrement: line.quantity } },
          });
        }
        await tx.order.update({
          where: { id: current.id },
          data: {
            status: mapped.order,
            paymentStatus: mapped.payment,
            paymentProvider: "MERCADOPAGO",
            providerTransactionId: txId,
            confirmationData: jsonPayload,
          },
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error en transacción";
      console.error("[mercadopago] error aprobando pedido", msg);
      return { ok: false, error: msg };
    }
    void sendOrderNotification(orderPayloadForEmail(order)).catch((err) =>
      console.error("[email] error silencioso:", err),
    );
    const customerMail = buildCustomerOrderConfirmationPayload(order);
    if (customerMail) {
      void sendOrderConfirmationToCustomer(customerMail).catch((err) =>
        console.error("[email] error correo cliente:", err),
      );
    }
    return { ok: true, duplicate: false, orderReference: order.reference };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: mapped.order,
      paymentStatus: mapped.payment,
      paymentProvider: "MERCADOPAGO",
      providerTransactionId: txId,
      confirmationData: jsonPayload,
    },
  });

  return { ok: true, duplicate: false, orderReference: order.reference };
}
