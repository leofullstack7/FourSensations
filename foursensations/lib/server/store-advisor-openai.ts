import {
  ADVISOR_RULES_LLM_THRESHOLD,
  buildAdvisorReply,
  buildAdvisorReplyForQuickPrompt,
  buildAdvisorSearchQueryWithHistory,
  formatProductForAdvisorContext,
  resolveAdvisorQuickPromptId,
  scoreProductsForQuery,
  shouldUseAdvisorLlm,
  type AdvisorHistoryTurn,
  type AiAdvisorReply,
} from "@/lib/ai-advisor";
import { isFollowUpMessage, summarizeAdvisorConversation } from "@/lib/ai-advisor-context";
import {
  appendProductFollowUp,
  buildOffTopicAdvisorReply,
  FS_ADVISOR_PERSONA,
  isLikelyOffTopicMessage,
} from "@/lib/ai-advisor-persona";
import { JULI_CATALOG_RULES } from "@/lib/juli-knowledge";
import { WHATSAPP_BUSINESS_DISPLAY } from "@/lib/storefront-contact";
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
const LLM_MAX_TOKENS = 340;

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
  const conversation = summarizeAdvisorConversation(input.history);

  const catalog =
    ranked.length > 0
      ? ranked
          .map(({ product, score }) => `${formatProductForAdvisorContext(product)} (rel:${score.toFixed(0)})`)
          .join("\n")
      : "Sin coincidencias claras.";

  return `${FS_ADVISOR_PERSONA}

Mantén el hilo. Recomienda SOLO productos Four Sensations del CATÁLOGO (ids exactos).
${JULI_CATALOG_RULES}
1-3 frases, español Colombia, como Juli: cercana y experta.

Despacho desde Manizales · Máx. 2 días hábiles para preparar el pedido (no es fecha de entrega) · Pago en línea (Mercado Pago) · Sin cambios comerciales por gusto · Garantía legal sí · Four Sensations — El Club de los Cabellos Perfectos.
WhatsApp de atención: ${WHATSAPP_BUSINESS_DISPLAY}.

CONVERSACIÓN:
${conversation}

Mensaje actual:
${input.message}

CATÁLOGO:
${catalog}

JSON (sin markdown):
{"text":"…","productIds":["id"],"productNotes":{"id":"por qué ayuda con su preocupación"}}`;
}

function rulesReplyHasProducts(reply: AiAdvisorReply): boolean {
  return reply.messages.some((m) => (m.productIds?.length ?? 0) > 0);
}

function withProductFollowUp(reply: AiAdvisorReply): AiAdvisorReply {
  return {
    ...reply,
    messages: appendProductFollowUp(reply.messages),
  };
}

export async function generateStoreAdvisorReply(input: LlmAdvisorInput): Promise<AiAdvisorReply> {
  const historyTurns = input.history;

  if (
    isLikelyOffTopicMessage(input.message, historyTurns) &&
    !isFollowUpMessage(input.message, historyTurns)
  ) {
    return buildOffTopicAdvisorReply();
  }

  const quickId = resolveAdvisorQuickPromptId(input.message);
  if (quickId && historyTurns.length < 2) {
    return buildAdvisorReplyForQuickPrompt(quickId, input.products);
  }

  const rulesReply = buildAdvisorReply(input.message, input.products, {
    historyTurns,
    engine: "rules",
  });

  const isFollowUp = historyTurns.length >= 2 && isFollowUpMessage(input.message, historyTurns);

  if (
    !isFollowUp &&
    rulesReplyHasProducts(rulesReply) &&
    rulesReply.confidence >= ADVISOR_RULES_LLM_THRESHOLD
  ) {
    return rulesReply;
  }

  if (!shouldUseAdvisorLlm(input.message, historyTurns)) {
    return rulesReply;
  }

  if (!isOpenAiConfigured()) {
    return rulesReply;
  }

  const searchQuery = buildAdvisorSearchQueryWithHistory(input.message, historyTurns);
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
      temperature: 0.42,
      max_tokens: LLM_MAX_TOKENS,
      messages: [
        {
          role: "system",
          content:
            "Eres Juli, asesora IA de Four Sensations. Solo JSON válido. Recomiendas productos reales de la tienda; invitas al carrito o favoritos.",
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
    .slice(0, 6);

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

  return withProductFollowUp({
    confidence: 0.75,
    engine: "openai",
    messages: [{ role: "bot", text, productIds, productHints }],
  });
}
