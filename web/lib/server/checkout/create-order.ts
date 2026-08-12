import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { SHIPPING_ZONES, checkoutShippingCop } from "@/lib/checkout/shipping-zones";
import { prisma } from "@/lib/prisma";
import { resolveProductPrice } from "@/lib/product-discount";
import { expireDueProductDiscounts } from "@/lib/server/product-discounts";
import { getActiveStoreComboById } from "@/lib/server/store-combos";
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

type OrderLineDraft = {
  productId: string | null;
  name: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

/** Reparte el precio del combo entre productos (suma exacta = comboPrice × qty). */
function expandComboToLines(
  combo: NonNullable<Awaited<ReturnType<typeof getActiveStoreComboById>>>,
  comboQty: number,
): OrderLineDraft[] {
  const retail = combo.retailTotal || combo.items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const targetTotal = combo.comboPrice * comboQty;
  const drafts: OrderLineDraft[] = [];
  let assigned = 0;

  for (let idx = 0; idx < combo.items.length; idx++) {
    const item = combo.items[idx]!;
    const qty = item.quantity * comboQty;
    const retailShare = item.product.price * item.quantity * comboQty;
    let lineTotal: number;
    if (idx === combo.items.length - 1) {
      lineTotal = Math.max(0, targetTotal - assigned);
    } else if (retail > 0) {
      lineTotal = Math.round((retailShare / retail) * targetTotal);
      assigned += lineTotal;
    } else {
      lineTotal = Math.floor(targetTotal / combo.items.length);
      assigned += lineTotal;
    }
    const unitPrice = qty > 0 ? Math.round(lineTotal / qty) : 0;
    const adjustedTotal = unitPrice * qty;
    if (idx === combo.items.length - 1 && adjustedTotal !== lineTotal) {
      // última línea absorbe residuo de redondeo unitario
    }
    drafts.push({
      productId: item.product.id,
      name: `${combo.name} · ${item.product.name}`,
      imageUrl: item.product.imageUrl,
      unitPrice,
      quantity: qty,
      lineTotal: unitPrice * qty,
    });
  }

  const sum = drafts.reduce((s, d) => s + d.lineTotal, 0);
  const drift = targetTotal - sum;
  if (drift !== 0 && drafts.length > 0) {
    const last = drafts[drafts.length - 1]!;
    last.lineTotal += drift;
    if (last.quantity > 0) last.unitPrice = Math.round(last.lineTotal / last.quantity);
    last.lineTotal = last.unitPrice * last.quantity;
    // residual de 1 COP por redondeo: ajusta lineTotal final
    const sum2 = drafts.reduce((s, d) => s + d.lineTotal, 0);
    if (sum2 !== targetTotal) {
      last.lineTotal += targetTotal - sum2;
    }
  }

  return drafts;
}

export async function createPendingOrderFromCheckout(
  input: CreateCheckoutOrderInput,
  options?: { userId?: string | null },
): Promise<CreateOrderResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, error: "Pedidos no disponibles (sin base de datos)", status: 503 };
  }

  try {
    const data = await prisma.$transaction(async (tx) => {
      const productIds = Array.from(
        new Set(input.items.map((i) => i.productId).filter((id): id is string => Boolean(id))),
      );
      if (productIds.length) {
        await expireDueProductDiscounts(tx, productIds);
      }
      const products = productIds.length
        ? await tx.product.findMany({
            where: { id: { in: productIds }, active: true },
          })
        : [];
      const byId = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      const lines: OrderLineDraft[] = [];
      /** Acumula demanda de stock por producto (productos sueltos + combos). */
      const stockNeed = new Map<string, number>();

      for (const line of input.items) {
        if (line.comboId) {
          const combo = await getActiveStoreComboById(line.comboId);
          if (!combo) {
            throw new Error(`Combo no disponible: ${line.comboId}`);
          }
          for (const item of combo.items) {
            const need = (stockNeed.get(item.product.id) ?? 0) + item.quantity * line.quantity;
            stockNeed.set(item.product.id, need);
          }
          const expanded = expandComboToLines(combo, line.quantity);
          for (const row of expanded) {
            subtotal += row.lineTotal;
            lines.push(row);
          }
          continue;
        }

        const productId = line.productId!;
        const p = byId.get(productId);
        if (!p) {
          throw new Error(`Producto no disponible: ${productId}`);
        }
        stockNeed.set(productId, (stockNeed.get(productId) ?? 0) + line.quantity);
        const unitPrice = resolveProductPrice(p).price;
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

      for (const [pid, need] of stockNeed) {
        const p =
          byId.get(pid) ??
          (await tx.product.findUnique({ where: { id: pid } }));
        if (!p || !p.active) {
          throw new Error(`Producto no disponible: ${pid}`);
        }
        if (p.stock < need) {
          throw new Error(`Stock insuficiente para «${p.name}»`);
        }
      }

      const shipping = checkoutShippingCop(input.shippingZoneId, subtotal);
      const total = subtotal + shipping;
      if (total <= 0) {
        throw new Error("Total inválido");
      }

      const reference = generateOrderReference();
      const zoneMeta = SHIPPING_ZONES[input.shippingZoneId];
      let addr = { ...input.shippingAddress };
      if (input.shippingZoneId === "pickup") {
        const l1 = addr.line1?.trim() ?? "";
        if (l1.length < 3) {
          addr = {
            ...addr,
            line1: "Recogida en tienda GinnaBeauty (coordinación por WhatsApp)",
          };
        }
      }
      const shippingJson = {
        ...addr,
        shippingZoneId: input.shippingZoneId,
        shippingZoneLabel: zoneMeta.shortLabel,
      } as unknown as Prisma.InputJsonValue;

      const order = await tx.order.create({
        data: {
          reference,
          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
          paymentProvider: input.paymentProvider ?? null,
          subtotal,
          shipping,
          total,
          currency: "COP",
          customerEmail: input.customerEmail.trim(),
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone?.trim() || null,
          shippingAddress: shippingJson,
          customerNote: input.customerNote?.trim() || null,
          userId: options?.userId ?? null,
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
    const isClient = /Producto no disponible|Combo no disponible|Stock insuficiente|Total inválido/.test(msg);
    return { ok: false, error: msg, status: isClient ? 400 : 500 };
  }
}
