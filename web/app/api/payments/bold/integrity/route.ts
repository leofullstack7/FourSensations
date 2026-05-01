import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z
  .object({
    orderId: z.string().min(1).optional(),
    reference: z.string().min(1).optional(),
    /** Entero COP (pesos), sin decimales en la cadena firmada. */
    amount: z.number().int().positive(),
    currency: z.literal("COP"),
  })
  .refine((b) => Boolean(b.orderId?.trim()) || Boolean(b.reference?.trim()), {
    message: "orderId o reference",
  });

/**
 * BTN-002 / firma integridad Bold:
 * cadena exacta, sin espacios ni separadores: orderId + amount + currency + BOLD_SECRET_KEY
 * - orderId: en nuestra tienda = `Order.reference` (no el cuid interno).
 * - amount: entero en pesos colombianos, solo dígitos (ej. 46000, nunca 46.000 ni 46000.00 en la cadena).
 * - currency: COP
 * - algoritmo: SHA-256 → hex minúsculas (digest("hex") de Node).
 */
function buildIntegritySignature(
  orderId: string,
  amountCopInteger: number,
  currency: string,
  secret: string,
): { signingString: string; hashHex: string } {
  const secretNorm = secret.trim();
  const amountStr = String(amountCopInteger);
  if (!/^\d+$/.test(amountStr)) {
    throw new Error("amount debe representarse solo con dígitos (entero COP)");
  }
  const signingString = `${orderId}${amountStr}${currency}${secretNorm}`;
  const hashHex = createHash("sha256").update(signingString, "utf8").digest("hex");
  return { signingString, hashHex };
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

  let integritySignature: string;
  try {
    const built = buildIntegritySignature(order.reference, amount, currency, secret.trim());
    integritySignature = built.hashHex;
    /** Temporal BTN-002: el string completo incluye el secret; en prod solo si BOLD_INTEGRITY_DEBUG=1. */
    const logFullSigningString =
      process.env.NODE_ENV !== "production" || process.env.BOLD_INTEGRITY_DEBUG === "1";
    if (logFullSigningString) {
      console.log("[bold] integrity (temp) string antes de hashear:", built.signingString);
    } else {
      console.log(
        "[bold] integrity (temp) string antes de hashear (sin secret):",
        `${order.reference}${String(amount)}${currency}<+BOLD_SECRET_KEY>`,
      );
    }
    console.log("[bold] integrity (temp) hash resultante:", integritySignature);
  } catch (e) {
    console.error("[bold] integrity", e);
    return NextResponse.json({ error: "Error generando firma" }, { status: 500 });
  }

  return NextResponse.json({ integritySignature, reference: order.reference, orderId: order.id });
}
