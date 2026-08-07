import { NextRequest } from "next/server";
import { AI_SPEND_OVERRIDE_PASSWORD, isAiUsageKind } from "@/lib/ai-spend/pricing";
import {
  getAiSpendSummary,
  listAiSpendEventsByKind,
  setAiSpendDisplayTotal,
} from "@/lib/server/ai-spend";
import { getCatalogVersionActor } from "@/lib/server/record-catalog-version";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Resumen del gasto IA para el dashboard. */
export async function GET(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const kindParam = req.nextUrl.searchParams.get("kind");
  if (kindParam) {
    if (!isAiUsageKind(kindParam)) {
      return noStoreJson({ error: "Función inválida" }, { status: 400 });
    }
    const events = await listAiSpendEventsByKind(kindParam);
    return noStoreJson({ kind: kindParam, events });
  }

  const summary = await getAiSpendSummary();
  return noStoreJson(summary);
}

/**
 * Ajuste manual del total (requiere clave).
 * Body: { password, targetTotalCop }
 */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let body: { password?: string; targetTotalCop?: number };
  try {
    body = (await req.json()) as { password?: string; targetTotalCop?: number };
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  if (body.password !== AI_SPEND_OVERRIDE_PASSWORD) {
    return noStoreJson({ error: "Clave incorrecta" }, { status: 403 });
  }

  const target = body.targetTotalCop;
  if (typeof target !== "number" || !Number.isFinite(target) || target < 0 || target > 1_000_000_000) {
    return noStoreJson({ error: "Total inválido" }, { status: 400 });
  }

  const createdBy = await getCatalogVersionActor();
  const result = await setAiSpendDisplayTotal({
    targetTotalCop: Math.round(target),
    createdBy,
  });
  const summary = await getAiSpendSummary();

  return noStoreJson({
    ...summary,
    versionNumber: result.versionNumber,
  });
}
