import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateCheckoutOrderInput } from "@/lib/validation/checkout-order";
import { generateOrderReference } from "@/lib/server/checkout/reference";

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      reference: string;
      subtotal: number;
      shipping: number;
      total: number;
      currency: string;
    }
  | { ok: false; error: string; status: number };

export async function createPendingOrderFromCheckout(input: CreateCheckoutOrderInput): Promise<CreateOrderResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, error: "Pedidos no disponibles (sin base de datos)", status: 503 };
  }

  const shipping = input.shipping ?? 0;

  try {
    const data = await prisma.$transaction(async (tx) => {
      const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, active: true },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      const lines: {
        productId: string;
        name: string;
        imageUrl: string | null;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
      }[] = [];

      for (const line of input.items) {
        const p = byId.get(line.productId);
        if (!p) {
          throw new Error(`Producto no disponible: ${line.productId}`);
        }
        if (p.stock < line.quantity) {
          throw new Error(`Stock insuficiente para «${p.name}»`);
        }
        const unitPrice = p.price;
        const lineTotal = unitPrice * line.quantity;
        subtotal += lineTotal;
        lines.push({
          productId: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          unitPrice,
          quantity: line.quantity,
          lineTotal,
        });
      }

      const total = subtotal + shipping;
      if (total <= 0) {
        throw new Error("Total inválido");
      }

      const reference = generateOrderReference();
      const shippingJson = input.shippingAddress as unknown as Prisma.InputJsonValue;

      const order = await tx.order.create({
        data: {
          reference,
          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
          subtotal,
          shipping,
          total,
          currency: "COP",
          customerEmail: input.customerEmail.trim(),
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone?.trim() || null,
          shippingAddress: shippingJson,
          customerNote: input.customerNote?.trim() || null,
          items: {
            create: lines.map((l) => ({
              productId: l.productId,
              name: l.name,
              imageUrl: l.imageUrl,
              unitPrice: l.unitPrice,
              quantity: l.quantity,
              lineTotal: l.lineTotal,
            })),
          },
        },
      });

      return {
        orderId: order.id,
        reference: order.reference,
        subtotal,
        shipping,
        total,
        currency: order.currency,
      };
    });

    return { ok: true, ...data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear el pedido";
    const isClient = /Producto no disponible|Stock insuficiente|Total inválido/.test(msg);
    return { ok: false, error: msg, status: isClient ? 400 : 500 };
  }
}
