import { NextResponse } from "next/server";
import { OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAddiOnlineApplication } from "@/lib/server/addi/client";
import {
  addiCallbackUrl,
  addiLogoUrl,
  addiRedirectionUrl,
  assertAddiConfig,
} from "@/lib/server/addi/env";

const bodySchema = z.object({
  orderId: z.string().min(1).optional(),
  reference: z.string().min(1).optional(),
  documentNumber: z.string().min(5).max(20),
}).refine((b) => b.orderId || b.reference, { message: "orderId o reference" });

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

  try {
    assertAddiConfig();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Config Addi incompleta";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const where = parsed.data.orderId
    ? { id: parsed.data.orderId }
    : { reference: parsed.data.reference! };

  const order = await prisma.order.findUnique({ where, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    return NextResponse.json({ error: "El pedido no admite un nuevo pago" }, { status: 409 });
  }

  const nameParts = order.customerName.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Cliente";
  const lastName = nameParts.slice(1).join(" ") || "Four";
  const addr =
    order.shippingAddress && typeof order.shippingAddress === "object"
      ? (order.shippingAddress as Record<string, unknown>)
      : {};
  const line1 = typeof addr.line1 === "string" ? addr.line1 : "Direccion";
  const city = typeof addr.city === "string" ? addr.city : "Manizales";
  const phone = order.customerPhone?.trim() || "";

  if (phone.replace(/\D/g, "").length < 7) {
    return NextResponse.json({ error: "Addi requiere un teléfono válido" }, { status: 400 });
  }

  try {
    const { redirectUrl, raw } = await createAddiOnlineApplication({
      orderId: order.id,
      reference: order.reference,
      totalAmount: order.total,
      shippingAmount: order.shipping,
      items: order.items.map((i) => ({
        sku: i.productId || i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        pictureUrl: i.imageUrl,
      })),
      client: {
        idNumber: parsed.data.documentNumber,
        firstName,
        lastName,
        email: order.customerEmail,
        cellphone: phone,
        addressLine: line1,
        city,
      },
      callbackUrl: addiCallbackUrl(),
      redirectionUrl: addiRedirectionUrl(order.reference),
      logoUrl: addiLogoUrl(),
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: "ADDI",
        providerPayload: {
          redirectUrl,
          documentNumber: parsed.data.documentNumber.replace(/\D/g, ""),
          addiRaw: raw as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      initPoint: redirectUrl,
      orderId: order.id,
      reference: order.reference,
      amount: order.total,
      currency: order.currency,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error creando checkout Addi";
    console.error("[addi] application", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
