import {
  ADVISOR_RULES_LLM_THRESHOLD,
  buildAdvisorReply,
  buildAdvisorReplyForQuickPrompt,
  formatProductForAdvisorContext,
  resolveAdvisorQuickPromptId,
  scoreProductsForQuery,
  buildAdvisorSearchQuery,
  shouldUseAdvisorLlm,
  type AdvisorHistoryTurn,
  type AiAdvisorReply,
} from "@/lib/ai-advisor";
import type { StoreProduct } from "@/lib/types/product";
import { isOpenAiConfigured } from "@/lib/server/product-ai-openai";

type LlmAdvisorInput = {
  message: string;
  history: AdvisorHistoryTurn[];
  products: StoreProduct[];
};

type LlmAdvisorJson = {
  text?: string;
  productIds?: string[];
  productNotes?: Record<string, string>;
};

const LLM_TOP_PRODUCTS = 6;
const LLM_MAX_TOKENS = 280;

function getOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  return { apiKey, model };
}

function parseAdvisorJson(content: string): LlmAdvisorJson {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("La IA no devolvió JSON");
  return JSON.parse(trimmed.slice(start, end + 1)) as LlmAdvisorJson;
}

function buildLlmPrompt(input: LlmAdvisorInput, ranked: { product: StoreProduct; score: number }[]): string {
  const userHistory = input.history
    .slice(-4)
    .map((t) => `${t.role === "user" ? "Cliente" : "Ginna AI"}: ${t.text}`)
    .join("\n");

  const catalog =
    ranked.length > 0
      ? ranked
          .map(({ product, score }) => `${formatProductForAdvisorContext(product)} (rel:${score.toFixed(0)})`)
          .join("\n")
      : "Sin coincidencias claras.";

  return `Ginna AI · GinnaBeauty Colombia. Español, tono premium y cercano.
Recomienda SOLO productos del CATÁLOGO (ids exactos). 1-2 frases máximo.

Envío gratis desde $150.000 COP · Pagos ePayco/Bold.

Historial:
${userHistory || "—"}

Cliente: ${input.message}

CATÁLOGO:
${catalog}

JSON (sin markdown):
{"text":"…","productIds":["id"],"productNotes":{"id":"motivo breve"}}`;
}

function rulesReplyHasProducts(reply: AiAdvisorReply): boolean {
  return reply.messages.some((m) => (m.productIds?.length ?? 0) > 0);
}

export async function generateStoreAdvisorReply(input: LlmAdvisorInput): Promise<AiAdvisorReply> {
  const userTurns = input.history.filter((h) => h.role === "user").map((h) => h.text);

  const quickId = resolveAdvisorQuickPromptId(input.message);
  if (quickId) {
    return buildAdvisorReplyForQuickPrompt(quickId, input.products);
  }

  const rulesReply = buildAdvisorReply(input.message, input.products, {
    history: userTurns,
    engine: "rules",
  });

  if (
    rulesReplyHasProducts(rulesReply) &&
    rulesReply.confidence >= ADVISOR_RULES_LLM_THRESHOLD
  ) {
    return rulesReply;
  }

  if (!shouldUseAdvisorLlm(input.message)) {
    return rulesReply;
  }

  if (!isOpenAiConfigured()) {
    return rulesReply;
  }

  const searchQuery = buildAdvisorSearchQuery(input.message, userTurns.slice(0, -1));
  const ranked = scoreProductsForQuery(input.products, searchQuery).slice(0, LLM_TOP_PRODUCTS);

  const { apiKey, model } = getOpenAiConfig();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: LLM_MAX_TOKENS,
      messages: [
        {
          role: "system",
          content: "Ginna AI. Solo JSON válido. Ids del catálogo provisto; nunca inventes.",
        },
        { role: "user", content: buildLlmPrompt(input, ranked) },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 180)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI sin contenido");

  const parsed = parseAdvisorJson(content);
  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  if (!text) throw new Error("JSON sin texto");

  const validIds = new Set(input.products.map((p) => p.id));
  const productIds = (Array.isArray(parsed.productIds) ? parsed.productIds : [])
    .filter((id): id is string => typeof id === "string" && validIds.has(id))
    .slice(0, 3);

  const productHints: Record<string, string> = {};
  if (parsed.productNotes && typeof parsed.productNotes === "object") {
    for (const id of productIds) {
      const note = parsed.productNotes[id];
      if (typeof note === "string" && note.trim()) productHints[id] = note.trim().slice(0, 120);
    }
  }

  if (productIds.length === 0) {
    if (rulesReplyHasProducts(rulesReply)) return rulesReply;
    return {
      confidence: 0.5,
      engine: "openai",
      messages: [{ role: "bot", text }],
    };
  }

  return {
    confidence: 0.75,
    engine: "openai",
    messages: [{ role: "bot", text, productIds, productHints }],
  };
}
