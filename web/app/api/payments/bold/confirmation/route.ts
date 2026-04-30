import { NextResponse } from "next/server";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Webhook / notificación servidor de Bold (estructura puede variar según el producto Bold).
 * Protege con `Authorization: Bearer <BOLD_SECRET_KEY>` si está definida.
 * Ajusta el parseo cuando tengas el payload oficial.
 */
export async function POST(req: Request) {
  const secret = process.env.BOLD_SECRET_KEY?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const reference =
    (typeof body.reference === "string" && body.reference) ||
    (typeof body.orderId === "string" && body.orderId) ||
    (typeof body.order_id === "string" && body.order_id) ||
    null;

  const statusRaw = String(body.status ?? body.payment_status ?? body.paymentStatus ?? "").toLowerCase();
  const approved = statusRaw === "approved" || statusRaw === "aceptada" || body.paid === true;

  if (!reference || !approved) {
    console.info("[bold] confirmation ignorado o pendiente", { reference, bodyKeys: Object.keys(body) });
    return NextResponse.json({ ok: true, handled: false });
  }

  const order = await prisma.order.findUnique({ where: { reference } });
  if (!order) {
    console.warn("[bold] confirmation: pedido no encontrado", reference);
    return NextResponse.json({ ok: true, handled: false });
  }

  if (order.paymentProvider !== "BOLD") {
    return NextResponse.json({ ok: true, handled: false });
  }

  if (order.status === OrderStatus.PAID && order.paymentStatus === PaymentStatus.APPROVED) {
    return NextResponse.json({ ok: true, handled: true, duplicate: true });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.APPROVED,
      confirmationData: body as Prisma.InputJsonValue,
    },
  });

  console.info("[bold] pedido marcado pagado", { reference });
  return NextResponse.json({ ok: true, handled: true });
}
