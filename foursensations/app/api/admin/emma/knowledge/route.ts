import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import {
  getEmmaKnowledgeState,
  publishEmmaDraft,
  resetEmmaDraftToDefault,
  restoreEmmaHistory,
  saveEmmaDraft,
} from "@/lib/server/emma-knowledge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const state = await getEmmaKnowledgeState();
  return noStoreJson(state);
}

export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (rec.action === "reset") {
    const state = await resetEmmaDraftToDefault();
    return noStoreJson(state);
  }
  if (rec.action === "restore") {
    const index = Number(rec.index);
    if (!Number.isInteger(index) || index < 0) {
      return noStoreJson({ error: "Índice inválido" }, { status: 400 });
    }
    try {
      const state = await restoreEmmaHistory(index);
      return noStoreJson(state);
    } catch {
      return noStoreJson({ error: "Versión no encontrada" }, { status: 404 });
    }
  }
  if (rec.action === "publish") {
    const state = await publishEmmaDraft(typeof rec.note === "string" ? rec.note : "");
    revalidatePath("/");
    revalidatePath("/inicio");
    return noStoreJson(state);
  }
  const draft = rec.draft ?? rec;
  const state = await saveEmmaDraft(draft);
  return noStoreJson(state);
}
