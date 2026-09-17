import { NextResponse } from "next/server";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Webhook / notificación servidor de Bold (estructura puede variar según el producto Bold).
 * - Producción: exige BOLD_SECRET_KEY y cabecera `Authorization: Bearer <BOLD_SECRET_KEY>`.
 * - Desarrollo sin clave: se registra advertencia (no apto para datos reales).
 * Si el payload trae monto (`amount`, `total`, `amount_in_cents`), debe coincidir con `Order.total` al aprobar.
 */
export async function POST(req: Request) {
  const secret = process.env.BOLD_SECRET_KEY?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !secret) {
    console.error("[bold] webhook: producción sin BOLD_SECRET_KEY");
    return NextResponse.json({ error: "Configuración incompleta" }, { status: 503 });
  }

  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  } else {
    console.warn("[bold] webhook: BOLD_SECRET_KEY vacía — webhook público (solo desarrollo)");
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
  const approvedStates = new Set([
    "approved",
    "aceptada",
    "paid",
    "completed",
    "successful",
    "succeeded",
    "success",
    "aprobada",
  ]);
  const approved =
    approvedStates.has(statusRaw) ||
    body.paid === true ||
    body.success === true ||
    String(body.result ?? "").toLowerCase() === "success";

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

  /** Monto en COP (misma unidad que `Order.total` y `data-amount` del botón embebido). */
  function extractBoldAmountCop(b: Record<string, unknown>): number | null {
    const keys = ["amount", "total", "value", "paid_amount", "transactionAmount", "orderAmount"];
    for (const k of keys) {
      const v = b[k];
      if (typeof v === "number" && Number.isFinite(v)) {
        return Math.round(v);
      }
      if (typeof v === "string" && v.trim()) {
        const n = Number.parseFloat(v.replace(/,/g, ".").replace(/[^\d.-]/g, ""));
        if (Number.isFinite(n)) return Math.round(n);
      }
    }
    const cents = b.amount_in_cents ?? b.amountInCents;
    if (typeof cents === "number" && Number.isFinite(cents)) {
      return Math.round(cents / 100);
    }
    return null;
  }

  const payloadTotal = extractBoldAmountCop(body);
  if (payloadTotal != null && payloadTotal !== order.total) {
    console.error("[bold] webhook rechazado: monto no coincide con pedido", {
      reference,
      orderTotal: order.total,
      payloadTotal,
    });
    return NextResponse.json({ error: "Monto no coincide" }, { status: 400 });
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
