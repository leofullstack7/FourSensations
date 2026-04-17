import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type FlatConfirmationPayload = Record<string, string>;

function parseAmountCop(amountStr: string): number | null {
  const n = Number.parseFloat(String(amountStr).replace(",", "."));
  if (Number.isNaN(n)) return null;
  return Math.round(n);
}

function mapXResponseToPaymentStatus(xResponse: string): PaymentStatus {
  switch (xResponse) {
    case "Aceptada":
      return PaymentStatus.APPROVED;
    case "Pendiente":
      return PaymentStatus.PROCESSING;
    case "Rechazada":
      return PaymentStatus.DECLINED;
    case "Fallida":
      return PaymentStatus.DECLINED;
    default:
      return PaymentStatus.PENDING;
  }
}

function mapXResponseToOrderStatus(xResponse: string): OrderStatus {
  switch (xResponse) {
    case "Aceptada":
      return OrderStatus.PAID;
    case "Pendiente":
      return OrderStatus.PENDING_PAYMENT;
    case "Rechazada":
    case "Fallida":
      return OrderStatus.FAILED;
    default:
      return OrderStatus.PENDING_PAYMENT;
  }
}

/**
 * Aplica confirmación ePayco de forma idempotente. La firma debe validarse antes de llamar.
 * @returns resultado para logs / respuesta HTTP
 */
export async function applyEpaycoConfirmation(
  payload: FlatConfirmationPayload,
): Promise<{ ok: true; duplicate: boolean; orderReference: string | null } | { ok: false; error: string }> {
  const xIdInvoice = payload.x_id_invoice?.trim();
  const refPayco = payload.ref_payco?.trim();
  const xRefPayco = payload.x_ref_payco?.trim();
  const xTransactionId = payload.x_transaction_id?.trim();
  const xResponse = payload.x_response?.trim();
  const xAmount = payload.x_amount?.trim();

  if (!xResponse) {
    return { ok: false, error: "Falta x_response" };
  }

  let order = xIdInvoice
    ? await prisma.order.findUnique({
        where: { reference: xIdInvoice },
        include: { items: true },
      })
    : null;

  if (!order && payload.x_extra1?.trim()) {
    order = await prisma.order.findUnique({
      where: { reference: payload.x_extra1.trim() },
      include: { items: true },
    });
  }

  if (!order) {
    console.warn("[epayco] webhook: pedido no encontrado", { x_id_invoice: xIdInvoice, ref_payco: refPayco });
    return { ok: true, duplicate: false, orderReference: null };
  }

  const amountOk = xAmount != null && parseAmountCop(xAmount) === order.total;
  if (!amountOk && xResponse === "Aceptada") {
    console.error("[epayco] webhook: monto no coincide con pedido", {
      orderId: order.id,
      expected: order.total,
      x_amount: xAmount,
    });
    return { ok: false, error: "Monto inválido" };
  }

  const jsonPayload = payload as unknown as Prisma.InputJsonValue;

  /** Ya procesado mismo cobro */
  if (
    order.paymentStatus === PaymentStatus.APPROVED &&
    order.status === OrderStatus.PAID &&
    xTransactionId &&
    order.providerTransactionId === xTransactionId
  ) {
    await prisma.order.update({
      where: { id: order.id },
      data: { confirmationData: jsonPayload, updatedAt: new Date() },
    });
    return { ok: true, duplicate: true, orderReference: order.reference };
  }

  if (order.paymentStatus === PaymentStatus.APPROVED && order.status === OrderStatus.PAID) {
    console.warn("[epayco] webhook: pedido ya pagado con otro tx id", {
      orderId: order.id,
      existing: order.providerTransactionId,
      incoming: xTransactionId,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { confirmationData: jsonPayload },
    });
    return { ok: true, duplicate: true, orderReference: order.reference };
  }

  const nextPayment = mapXResponseToPaymentStatus(xResponse);
  const nextOrder = mapXResponseToOrderStatus(xResponse);

  if (xResponse === "Aceptada") {
    try {
      await prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({
          where: { id: order!.id },
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
            status: nextOrder,
            paymentStatus: nextPayment,
            paymentProvider: "EPAYCO",
            providerTransactionId: xTransactionId || xRefPayco || refPayco || current.providerTransactionId,
            confirmationData: jsonPayload,
          },
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error en transacción";
      console.error("[epayco] webhook: error aprobando pedido", msg);
      return { ok: false, error: msg };
    }
    return { ok: true, duplicate: false, orderReference: order.reference };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: nextOrder,
      paymentStatus: nextPayment,
      paymentProvider: "EPAYCO",
      providerTransactionId: xTransactionId || order.providerTransactionId,
      confirmationData: jsonPayload,
    },
  });

  return { ok: true, duplicate: false, orderReference: order.reference };
}
