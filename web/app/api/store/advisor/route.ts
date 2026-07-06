import { NextRequest } from "next/server";
import { buildAdvisorReply, type AdvisorHistoryTurn } from "@/lib/ai-advisor";
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
    .map((t) => ({ role: t.role, text: t.text.trim().slice(0, 500) }))
    .filter((t) => t.text.length > 0)
    .slice(-8);
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
    const userHistory = history.filter((h) => h.role === "user").map((h) => h.text);

    try {
      const reply = await generateStoreAdvisorReply({ message, history, products });
      return noStoreJson(reply);
    } catch (llmErr) {
      console.warn("[POST /api/store/advisor] LLM fallback:", llmErr);
      const fallback = buildAdvisorReply(message, products, { history: userHistory, engine: "rules" });
      return noStoreJson(fallback);
    }
  } catch (e) {
    console.error("[POST /api/store/advisor]", e);
    return noStoreJson({ error: "Error del asesor" }, { status: 500 });
  }
}
