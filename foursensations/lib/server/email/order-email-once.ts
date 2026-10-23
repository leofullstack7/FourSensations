import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureStoreSchemaExtras } from "@/lib/server/ensure-schema";
import {
  buildCustomerOrderConfirmationPayload,
  sendOrderConfirmationToCustomer,
} from "@/lib/server/email/order-confirmation-customer";
import { orderPayloadForEmail, sendOrderNotification } from "@/lib/server/email/order-notification";

type OrderWithItems = {
  id: string;
  reference: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNote?: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  shippingAddress: Prisma.JsonValue;
  paymentProvider: string | null;
  couponCode: string | null;
  storeEmailSentAt?: Date | null;
  customerEmailSentAt?: Date | null;
  items: Array<{ name: string; quantity: number; unitPrice: number; imageUrl?: string | null }>;
};

/**
 * Marca y envía correos de pedido como máximo una vez (tienda + cliente).
 * Segura ante webhooks/sync concurrentes.
 */
export async function sendOrderEmailsOnce(
  orderId: string,
  opts?: { store?: boolean; customer?: boolean },
): Promise<void> {
  await ensureStoreSchemaExtras();
  const wantStore = opts?.store !== false;
  const wantCustomer = opts?.customer !== false;

  const claimed = await prisma.$transaction(async (tx) => {
    const order = (await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })) as OrderWithItems | null;
    if (!order) return null;

    const sendStore = wantStore && !(order as { storeEmailSentAt?: Date | null }).storeEmailSentAt;
    const sendCustomer =
      wantCustomer && !(order as { customerEmailSentAt?: Date | null }).customerEmailSentAt;
    if (!sendStore && !sendCustomer) {
      return { sendStore: false, sendCustomer: false, order };
    }

    await tx.order.update({
      where: { id: orderId },
      // Columnas añadidas en runtime vía ensure-schema / prisma generate
      data: {
        ...(sendStore ? { storeEmailSentAt: new Date() } : {}),
        ...(sendCustomer ? { customerEmailSentAt: new Date() } : {}),
      } as Record<string, Date>,
    });

    return { sendStore, sendCustomer, order };
  });

  if (!claimed) return;

  if (claimed.sendStore) {
    await sendOrderNotification(orderPayloadForEmail(claimed.order)).catch((err) =>
      console.error("[email] aviso tienda (once)", err),
    );
  }

  if (claimed.sendCustomer) {
    const payload = buildCustomerOrderConfirmationPayload(claimed.order);
    if (payload) {
      await sendOrderConfirmationToCustomer(payload).catch((err) =>
        console.error("[email] confirmación cliente (once)", err),
      );
    }
  }
}
