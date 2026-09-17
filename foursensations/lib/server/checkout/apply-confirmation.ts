import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildCustomerOrderConfirmationPayload,
  sendOrderConfirmationToCustomer,
} from "@/lib/server/email/order-confirmation-customer";
import { orderPayloadForEmail, sendOrderNotification } from "@/lib/server/email/order-notification";

export type FlatConfirmationPayload = Record<string, string>;

function parseAmountCop(amountStr: string | undefined): number | null {
  if (amountStr == null || !String(amountStr).trim()) return null;
  const n = Number.parseFloat(String(amountStr).replace(",", ".").replace(/[^\d.-]/g, ""));
  if (Number.isNaN(n)) return null;
  return Math.round(n);
}

/** ePayco puede enviar el monto en varias claves según el producto / versión del checkout. */
function parseAmountFromEpaycoPayload(payload: FlatConfirmationPayload): number | null {
  const keys = ["x_amount", "x_amount_base", "x_amount_ok", "x_amount_cuota"];
  for (const k of keys) {
    const v = parseAmountCop(payload[k]);
    if (v != null) return v;
  }
  return null;
}

type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

async function findOrderWithItemsForEpayco(payload: FlatConfirmationPayload): Promise<OrderWithItems | null> {
  const include = { items: true as const };
  const triedRefs = new Set<string>();
  const tryRef = async (ref: string | undefined) => {
    const t = ref?.trim();
    if (!t || triedRefs.has(t)) return null;
    triedRefs.add(t);
    return prisma.order.findUnique({ where: { reference: t }, include });
  };

  let order =
    (await tryRef(payload.x_id_invoice)) ??
    (await tryRef(payload.x_extra1)) ??
    null;

  const xExtra2 = payload.x_extra2?.trim();
  if (!order && xExtra2) {
    order = await prisma.order.findUnique({ where: { id: xExtra2 }, include });
  }

  if (!order) {
    const refPayco = payload.ref_payco?.trim();
    const xRefPayco = payload.x_ref_payco?.trim();
    for (const rp of [refPayco, xRefPayco]) {
      if (!rp) continue;
      const byProv = await prisma.order.findFirst({
        where: { providerTransactionId: rp },
        include,
      });
      if (byProv) {
        order = byProv;
        break;
      }
    }
  }

  return order;
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
  const refPayco = payload.ref_payco?.trim();
  const xRefPayco = payload.x_ref_payco?.trim();
  const xTransactionId = payload.x_transaction_id?.trim();
  const xResponse = payload.x_response?.trim();

  if (!xResponse) {
    return { ok: false, error: "Falta x_response" };
  }

  const order = await findOrderWithItemsForEpayco(payload);

  if (!order) {
    console.warn("[epayco] webhook: pedido no encontrado", {
      x_id_invoice: payload.x_id_invoice?.trim(),
      x_extra1: payload.x_extra1?.trim(),
      x_extra2: payload.x_extra2?.trim(),
      ref_payco: refPayco,
      x_ref_payco: payload.x_ref_payco?.trim(),
    });
    return { ok: true, duplicate: false, orderReference: null };
  }

  const paidAmount = parseAmountFromEpaycoPayload(payload);
  let amountOk = paidAmount != null && paidAmount === order.total;
  if (!amountOk && paidAmount != null && Math.abs(paidAmount - order.total) <= 1) {
    amountOk = true;
  }
  if (!amountOk && xResponse === "Aceptada") {
    console.error("[epayco] webhook: monto no coincide con pedido", {
      orderId: order.id,
      expected: order.total,
      parsedAmount: paidAmount,
      x_amount: payload.x_amount,
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
      status: nextOrder,
      paymentStatus: nextPayment,
      paymentProvider: "EPAYCO",
      providerTransactionId: xTransactionId || xRefPayco || refPayco || order.providerTransactionId,
      confirmationData: jsonPayload,
    },
  });

  return { ok: true, duplicate: false, orderReference: order.reference };
}
