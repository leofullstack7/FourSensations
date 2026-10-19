import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { ensureStoreSchemaExtras } from "@/lib/server/ensure-schema";
import { clampFulfillmentStage } from "@/lib/fulfillment-kanban";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const id = ctx.params?.id?.trim();
  if (!id) return noStoreJson({ error: "Pedido inválido" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { stage?: unknown } | null;
  const stage = clampFulfillmentStage(body?.stage);
  if (body?.stage == null || Number(body.stage) !== stage) {
    return noStoreJson({ error: "Fase inválida (1–5)" }, { status: 400 });
  }

  try {
    await ensureStoreSchemaExtras();
    const now = new Date();
    const updated = await prisma.order.update({
      where: { id },
      data: {
        fulfillmentStage: stage,
        fulfillmentStageAt: now,
      },
      select: {
        id: true,
        fulfillmentStage: true,
        fulfillmentStageAt: true,
      },
    });
    return noStoreJson({
      id: updated.id,
      fulfillmentStage: clampFulfillmentStage(updated.fulfillmentStage),
      fulfillmentStageAt: updated.fulfillmentStageAt.toISOString(),
    });
  } catch (e) {
    console.error("[PATCH /api/admin/orders/:id/fulfillment]", e);
    return noStoreJson({ error: "No se pudo actualizar la fase" }, { status: 500 });
  }
}
