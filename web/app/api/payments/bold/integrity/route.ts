import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z
  .object({
    orderId: z.string().min(1).optional(),
    reference: z.string().min(1).optional(),
    amount: z.number().int().positive(),
    currency: z.literal("COP"),
  })
  .refine((b) => Boolean(b.orderId?.trim()) || Boolean(b.reference?.trim()), {
    message: "orderId o reference",
  });

function buildIntegritySignature(reference: string, amount: number, currency: string, secret: string): string {
  const payload = `${reference}${amount}${currency}${secret}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Firma de integridad Bold: SHA256(orderId + amount + currency + BOLD_SECRET_KEY)
 * `orderId` en la doc de Bold corresponde a nuestra referencia interna (`Order.reference`).
 */
export async function POST(req: Request) {
  const secret = process.env.BOLD_SECRET_KEY?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Bold no configurado (BOLD_SECRET_KEY)" }, { status: 503 });
  }

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

  const { orderId, reference: refIn, amount, currency } = parsed.data;

  const order = await prisma.order.findFirst({
    where: orderId ? { id: orderId } : { reference: refIn! },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (order.paymentProvider !== "BOLD") {
    return NextResponse.json(
      { error: "El pedido no está configurado para Bold" },
      { status: 409 },
    );
  }

  if (amount !== order.total || currency !== order.currency) {
    return NextResponse.json({ error: "El monto no coincide con el pedido" }, { status: 400 });
  }

  const integritySignature = buildIntegritySignature(order.reference, amount, currency, secret);

  return NextResponse.json({ integritySignature, reference: order.reference, orderId: order.id });
}
