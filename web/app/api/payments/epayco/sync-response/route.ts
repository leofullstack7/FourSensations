import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { extractInvoiceFromValidationJson, fetchEpaycoReferenceValidation } from "@/lib/server/epayco/validation-lookup";

const schema = z.object({
  refPayco: z.string().min(4).optional(),
  reference: z.string().min(4).optional(),
  query: z.record(z.string(), z.string()).optional(),
});

/**
 * Tras la redirección del checkout, enlaza `ref_payco` con el pedido y guarda datos no autoritativos en `responseData`.
 * No marca el pedido como pagado.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validación" }, { status: 400 });
  }

  const { refPayco, reference, query } = parsed.data;
  if (!refPayco && !reference) {
    return NextResponse.json({ error: "refPayco o reference" }, { status: 400 });
  }

  let orderRef = reference?.trim() ?? null;

  if (!orderRef && refPayco) {
    const validation = await fetchEpaycoReferenceValidation(refPayco);
    orderRef = extractInvoiceFromValidationJson(validation);
  }

  if (!orderRef) {
    return NextResponse.json({
      ok: true,
      linked: false,
      message: "No se pudo enlazar con un pedido; espera la confirmación por correo.",
    });
  }

  const order = await prisma.order.findUnique({ where: { reference: orderRef } });
  if (!order) {
    return NextResponse.json({ ok: true, linked: false, message: "Pedido no encontrado" });
  }

  const responseData = {
    ...(typeof order.responseData === "object" && order.responseData !== null ? order.responseData : {}),
    clientQuery: query ?? {},
    refPayco: refPayco ?? null,
    syncedAt: new Date().toISOString(),
  } as Prisma.InputJsonValue;

  await prisma.order.update({
    where: { id: order.id },
    data: { responseData },
  });

  return NextResponse.json({
    ok: true,
    linked: true,
    reference: order.reference,
  });
}
