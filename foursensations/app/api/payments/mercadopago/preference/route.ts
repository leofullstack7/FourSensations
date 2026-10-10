import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createMercadoPagoPreference } from "@/lib/server/mercadopago/client";
import {
  assertMercadoPagoConfig,
  mercadoPagoBackUrl,
  mercadoPagoNotificationUrl,
} from "@/lib/server/mercadopago/env";

const bodySchema = z
  .object({
    orderId: z.string().min(1).optional(),
    reference: z.string().min(1).optional(),
  })
  .refine((b) => b.orderId || b.reference, { message: "orderId o reference" });

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validación", details: parsed.error.flatten() }, { status: 400 });
  }

  let accessToken: string;
  let backUrl: string;
  let notificationUrl: string;
  try {
    ({ accessToken } = assertMercadoPagoConfig());
    const where = parsed.data.orderId
      ? { id: parsed.data.orderId }
      : { reference: parsed.data.reference! };
    const preview = await prisma.order.findUnique({ where, select: { reference: true } });
    if (!preview) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    backUrl = mercadoPagoBackUrl(preview.reference);
    notificationUrl = mercadoPagoNotificationUrl();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Configuración Mercado Pago incompleta";
    console.error("[mercadopago] preference config:", msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const where = parsed.data.orderId
    ? { id: parsed.data.orderId }
    : { reference: parsed.data.reference! };

  const order = await prisma.order.findUnique({ where, include: { items: true } });
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    return NextResponse.json({ error: "El pedido no admite un nuevo pago" }, { status: 409 });
  }

  const title =
    order.items[0]?.name?.slice(0, 100) || `Pedido Four Sensations ${order.reference}`;

  try {
    const pref = await createMercadoPagoPreference({
      accessToken,
      title,
      amount: order.total,
      reference: order.reference,
      orderId: order.id,
      email: order.customerEmail,
      name: order.customerName,
      backUrl,
      notificationUrl,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: "MERCADOPAGO",
        providerPayload: {
          preferenceId: pref.id,
          initPoint: pref.initPoint,
        },
      },
    });

    return NextResponse.json({
      preferenceId: pref.id,
      initPoint: pref.initPoint,
      orderId: order.id,
      reference: order.reference,
      amount: order.total,
      currency: order.currency,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error creando preferencia Mercado Pago";
    console.error("[mercadopago] preference", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
