import { NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSmartCheckoutSession } from "@/lib/server/epayco/apify-client";
import { assertCheckoutUrls, getEpaycoServerConfig } from "@/lib/server/epayco/env";

const bodySchema = z
  .object({
    orderId: z.string().min(1).optional(),
    reference: z.string().min(1).optional(),
    checkoutType: z.enum(["onpage", "standard"]).optional(),
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

  let responseUrl: string;
  let confirmationUrl: string;
  try {
    ({ responseUrl, confirmationUrl } = assertCheckoutUrls());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Configuración ePayco incompleta";
    console.error("[epayco] session:", msg);
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const { merchantName, test } = getEpaycoServerConfig();

  const where = parsed.data.orderId
    ? { id: parsed.data.orderId }
    : { reference: parsed.data.reference! };

  const order = await prisma.order.findUnique({ where });
  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    return NextResponse.json({ error: "El pedido no admite un nuevo pago" }, { status: 409 });
  }

  if (order.paymentProvider === "BOLD") {
    return NextResponse.json(
      { error: "Este pedido está reservado para pago con Bold. Vuelve al checkout y elige Bold." },
      { status: 409 },
    );
  }

  const responseWithRef = responseUrl.includes("?")
    ? `${responseUrl}&ref=${encodeURIComponent(order.reference)}`
    : `${responseUrl}?ref=${encodeURIComponent(order.reference)}`;

  const ship = order.shippingAddress as Record<string, unknown> | null;
  const line1 = ship && typeof ship.line1 === "string" ? ship.line1 : "";

  const description =
    (await prisma.orderItem.findFirst({
      where: { orderId: order.id },
      select: { name: true },
    }))?.name?.slice(0, 120) || "Pedido GinnaBeauty";

  const sessionBody: Record<string, unknown> = {
    checkout_version: "2",
    name: merchantName,
    description,
    currency: order.currency || "COP",
    amount: order.total,
    lang: "ES",
    country: "CO",
    invoice: order.reference,
    response: responseWithRef,
    confirmation: confirmationUrl,
    method: "POST",
    extras: {
      extra1: order.reference,
      extra2: order.id,
    },
    billing: {
      email: order.customerEmail,
      name: order.customerName,
      address: line1,
      mobilePhone: order.customerPhone ?? undefined,
    },
  };

  let sessionId: string;
  let sessionToken: string | undefined;
  try {
    const created = await createSmartCheckoutSession({ body: sessionBody });
    sessionId = created.sessionId;
    sessionToken = created.sessionToken;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error creando sesión ePayco";
    console.error("[epayco] create session", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const providerPayload = {
    ...sessionBody,
    billing: sessionBody.billing,
    /** No guardar secretos; solo metadatos útiles */
    checkoutType: parsed.data.checkoutType ?? "onpage",
  } as Prisma.InputJsonValue;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentProvider: "EPAYCO",
      epaycoSessionId: sessionId,
      providerPayload,
    },
  });

  console.info("[epayco] session creada", {
    test,
    reference: order.reference,
    amount: order.total,
    sessionIdPrefix: sessionId.slice(0, 8),
  });

  return NextResponse.json({
    sessionId,
    sessionToken,
    orderId: order.id,
    reference: order.reference,
    checkoutType: parsed.data.checkoutType ?? "onpage",
    test,
    amount: order.total,
    currency: order.currency,
  });
}
