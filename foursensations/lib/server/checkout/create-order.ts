import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import {
  SHIPPING_ZONES,
  checkoutShippingCop,
  guessShippingZoneFromCity,
  resolveShippingCarrier,
} from "@/lib/checkout/shipping-zones";
import { prisma } from "@/lib/prisma";
import { resolveProductPrice } from "@/lib/product-discount";
import { expireDueProductDiscounts } from "@/lib/server/product-discounts";
import { getActiveStoreComboById } from "@/lib/server/store-combos";
import type { CreateCheckoutOrderInput } from "@/lib/validation/checkout-order";
import { generateOrderReference } from "@/lib/server/checkout/reference";
import { getWholesaleUnitPrice } from "@/lib/wholesale-pricing";
import { checkoutChannelFromAddress, resolveWholesaleCycle } from "@/lib/wholesale-rules";
import { quoteCouponForCart } from "@/lib/server/coupons";

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      reference: string;
      subtotal: number;
      shipping: number;
      discount: number;
      total: number;
      currency: string;
      couponCode?: string | null;
      paymentProvider?: string | null;
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

  let wholesaleMin: number | null = null;
  const wantsRetail = input.pricingMode === "retail";
  if (options?.userId && !wantsRetail) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: options.userId },
        select: { isWholesale: true, email: true },
      });
      if (user?.isWholesale) {
        const emailNorm = user.email?.trim().toLowerCase() || null;
        const paid = await prisma.order.findMany({
          where: {
            OR: [
              { userId: options.userId },
              ...(emailNorm ? [{ customerEmail: { equals: emailNorm, mode: "insensitive" as const } }] : []),
            ],
          },
          select: {
            total: true,
            createdAt: true,
            paymentStatus: true,
            status: true,
            paymentProvider: true,
            shippingAddress: true,
          },
          take: 80,
        });
        wholesaleMin = resolveWholesaleCycle(
          paid.map((order) => ({
            ...order,
            checkoutChannel: checkoutChannelFromAddress(order.shippingAddress),
          })),
        ).minimumOrder;
      }
    } catch {
      wholesaleMin = null;
    }
  }

  const wholesaleCheckout = wholesaleMin != null;

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
        const publicPrice = resolveProductPrice(p).price;
        const unitPrice = wholesaleCheckout ? getWholesaleUnitPrice(p.name, publicPrice) : publicPrice;
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

      for (const [pid] of stockNeed) {
        const p =
          byId.get(pid) ??
          (await tx.product.findUnique({ where: { id: pid } }));
        if (!p || !p.active) {
          throw new Error(`Producto no disponible: ${pid}`);
        }
      }

      if (wholesaleCheckout && input.couponCode?.trim()) {
        throw new Error("Los pedidos mayorista no aceptan cupones ni bonos.");
      }
      if (wholesaleCheckout && input.paymentProvider && input.paymentProvider !== "CONTRAENTREGA") {
        throw new Error("Los pedidos mayorista se pagan contraentrega.");
      }
      if (!wholesaleCheckout && input.paymentProvider === "CONTRAENTREGA") {
        throw new Error("El pago contraentrega es solo para compras como mayorista.");
      }
      if (wholesaleCheckout && wholesaleMin != null && subtotal < wholesaleMin) {
        const missing = Math.max(0, wholesaleMin - subtotal);
        throw new Error(
          `Recuerda que debes acumular un mínimo de $${wholesaleMin.toLocaleString("es-CO")} para poder pagar con los precios para mayorista, este pedido vale $${subtotal.toLocaleString("es-CO")}, te falta $${missing.toLocaleString("es-CO")}.`,
        );
      }

      const addr = {
        ...input.shippingAddress,
        ...(input.customerDocument?.trim()
          ? { documentNumber: input.customerDocument.replace(/\D/g, "") }
          : {}),
      };
      const city = (addr.city ?? "").trim();
      const region = addr.region?.trim();
      const zoneId = guessShippingZoneFromCity(city) || input.shippingZoneId;
      const carrier = resolveShippingCarrier(city, region);
      const shippingBase = checkoutShippingCop(zoneId, { city, region, carrier });

      let discount = 0;
      let shipping = shippingBase;
      let couponId: string | null = null;
      let couponCode: string | null = null;

      if (!wholesaleCheckout && input.couponCode?.trim()) {
        const quoted = await quoteCouponForCart(input.couponCode, {
          subtotal,
          shipping: shippingBase,
          customerEmail: input.customerEmail,
        });
        if (!quoted.ok) {
          throw new Error(quoted.error);
        }
        discount = quoted.discount;
        shipping = quoted.shippingAfter;
        couponId = quoted.couponId;
        couponCode = quoted.code;
      }

      // FREE_SHIPPING: shipping=0 y discount=ahorro de envío → no restar de nuevo.
      // PERCENT/FIXED: shipping intacto → restar discount del subtotal.
      const finalTotal =
        shipping < shippingBase
          ? Math.max(0, subtotal + shipping)
          : Math.max(0, subtotal + shipping - discount);

      if (finalTotal <= 0) {
        throw new Error("Total inválido tras aplicar el cupón");
      }

      const reference = generateOrderReference();
      const zoneMeta = SHIPPING_ZONES[zoneId];
      const shippingJson = {
        ...addr,
        shippingZoneId: zoneId,
        shippingZoneLabel: zoneMeta.shortLabel,
        shippingCarrier: carrier,
        shippingCarrierLabel: carrier === "envia" ? "Envía" : "Interrapidísimo",
        ...(couponCode ? { couponCode, couponDiscount: discount } : {}),
        checkoutChannel: wholesaleCheckout ? "wholesale" : "retail",
      } as unknown as Prisma.InputJsonValue;
      const paymentProvider = wholesaleCheckout ? "CONTRAENTREGA" : input.paymentProvider ?? null;

      const order = await tx.order.create({
        data: {
          reference,
          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.PENDING,
          paymentProvider,
          subtotal,
          shipping,
          discount,
          total: finalTotal,
          currency: "COP",
          couponId,
          couponCode,
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
        discount,
        total: finalTotal,
        currency: order.currency,
        couponCode,
        paymentProvider,
      };
    });

    return { ok: true, ...data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear el pedido";
    const isClient = /Producto no disponible|Combo no disponible|Stock insuficiente|Total inválido|pedido mayorista|cupón|Cupón|Envío gratis|agotó|mínima|contraentrega|mayorista/.test(msg);
    return { ok: false, error: msg, status: isClient ? 400 : 500 };
  }
}
