import { NextRequest } from "next/server";
import { buildAdvisorReply, type AdvisorHistoryTurn } from "@/lib/ai-advisor";
import { ADVISOR_MAX_TURNS } from "@/lib/ai-advisor-context";
import { getStorefrontProducts } from "@/lib/products";
import { generateStoreAdvisorReply } from "@/lib/server/store-advisor-openai";
import { noStoreJson } from "@/lib/server/no-store-json";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

type AdvisorRequestBody = {
  message?: string;
  history?: AdvisorHistoryTurn[];
};

function sanitizeHistory(raw: unknown): AdvisorHistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is AdvisorHistoryTurn =>
        Boolean(t) &&
        typeof t === "object" &&
        (t.role === "user" || t.role === "bot") &&
        typeof (t as AdvisorHistoryTurn).text === "string",
    )
    .map((t) => {
      const turn = t as AdvisorHistoryTurn & { productIds?: unknown };
      const productIds = Array.isArray(turn.productIds)
        ? turn.productIds.filter((id): id is string => typeof id === "string").slice(0, 6)
        : undefined;
      return {
        role: turn.role,
        text: turn.text.trim().slice(0, 500),
        ...(productIds?.length ? { productIds } : {}),
      };
    })
    .filter((t) => t.text.length > 0)
    .slice(-ADVISOR_MAX_TURNS);
}

/** Asesor Ginna AI: catálogo Prisma + reglas; OpenAI si hay API key. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AdvisorRequestBody;
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
    const history = sanitizeHistory(body.history);

    if (!message) {
      return noStoreJson({ error: "Mensaje vacío" }, { status: 400 });
    }

    const products = await getStorefrontProducts();

    try {
      const reply = await generateStoreAdvisorReply({ message, history, products });
      return noStoreJson(reply);
    } catch (llmErr) {
      console.warn("[POST /api/store/advisor] LLM fallback:", llmErr);
      const fallback = buildAdvisorReply(message, products, { historyTurns: history, engine: "rules" });
      return noStoreJson(fallback);
    }
  } catch (e) {
    console.error("[POST /api/store/advisor]", e);
    return noStoreJson({ error: "Error del asesor" }, { status: 500 });
  }
}
