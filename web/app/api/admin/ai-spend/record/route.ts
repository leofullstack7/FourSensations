import { NextRequest } from "next/server";
import { isAiUsageKind, type AiUsageKindKey } from "@/lib/ai-spend/pricing";
import { recordAiUsageEvent } from "@/lib/server/ai-spend";
import { noStoreJson } from "@/lib/server/no-store-json";
import { requireAdminApi } from "@/lib/server/require-admin-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Registra un evento de gasto (p. ej. optimizar imágenes en cliente). */
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  let body: { kind?: string; note?: string; label?: string };
  try {
    body = (await req.json()) as { kind?: string; note?: string; label?: string };
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.kind || !isAiUsageKind(body.kind)) {
    return noStoreJson({ error: "kind inválido" }, { status: 400 });
  }

  // Solo permitir registrar desde cliente los kinds que no se cobran en otra API.
  const allowedFromClient: AiUsageKindKey[] = ["IMAGE_OPTIMIZE", "COMBINE_SUGGEST"];
  if (!allowedFromClient.includes(body.kind)) {
    return noStoreJson({ error: "Este uso se registra automáticamente en el servidor" }, { status: 400 });
  }

  const result = await recordAiUsageEvent({
    kind: body.kind,
    note: body.note ?? null,
    label: body.label,
  });

  return noStoreJson({ ok: true, ...result });
}
