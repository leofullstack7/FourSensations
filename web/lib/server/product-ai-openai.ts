import type { AiCompletableField } from "@/lib/product-ai-fields";

export type AiCompleteSuggestion = Partial<{
  description: string;
  tags: string[];
  emoji: string;
  badge: "new" | "hot" | "sale" | "best" | null;
}>;

export type ProductAiContext = {
  name: string;
  brand: string;
  categoryLabel: string;
  categorySlug: string;
  subcategory: string;
  priceCop: number;
  emptyFields: AiCompletableField[];
  menuTagHints: string[];
};

function getOpenAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no está configurada. Añádela en .env.local para usar completado con IA.");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  return { apiKey, model };
}

function buildPrompt(ctx: ProductAiContext): string {
  const fields = ctx.emptyFields.join(", ");
  return `Eres redactora de e-commerce de cosméticos para GinnaBeauty (Colombia).
Completa SOLO los campos vacíos del producto usando categoría y subcategoría como contexto principal.
Responde ÚNICAMENTE JSON válido (sin markdown) con las claves que correspondan a campos vacíos.

Producto:
- Nombre: ${ctx.name}
- Marca: ${ctx.brand}
- Categoría: ${ctx.categoryLabel} (${ctx.categorySlug})
- Subcategoría: ${ctx.subcategory}
- Precio COP: ${ctx.priceCop}
- Etiquetas de menú sugeridas: ${ctx.menuTagHints.length ? ctx.menuTagHints.join(", ") : "ninguna"}

Campos a completar: ${fields}

Reglas:
- description: 2-4 frases en español, beneficios claros, tono premium y cercano. Sin inventar ingredientes específicos si no aparecen en el nombre.
- tags: array de 3-8 strings cortos en español (intención de búsqueda: hidratante, mate, reparación…). Preferir etiquetas de menú cuando encajen.
- emoji: un solo emoji representativo del producto (string de 1 emoji).
- badge: uno de "new", "hot", "sale", "best" o null. Usar solo si encaja; si dudas, null.

JSON ejemplo:
{"description":"…","tags":["…"],"emoji":"💄","badge":null}`;
}

function parseAiJson(content: string): AiCompleteSuggestion {
  const trimmed = content.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("La IA no devolvió JSON");
  const raw = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;

  const out: AiCompleteSuggestion = {};
  if (typeof raw.description === "string" && raw.description.trim()) {
    out.description = raw.description.trim().slice(0, 4000);
  }
  if (Array.isArray(raw.tags)) {
    out.tags = raw.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof raw.emoji === "string" && raw.emoji.trim()) {
    out.emoji = [...raw.emoji.trim()][0] ?? raw.emoji.trim().slice(0, 4);
  }
  if (raw.badge === null) out.badge = null;
  else if (raw.badge === "new" || raw.badge === "hot" || raw.badge === "sale" || raw.badge === "best") {
    out.badge = raw.badge;
  }
  return out;
}

export async function generateProductAiSuggestions(ctx: ProductAiContext): Promise<AiCompleteSuggestion> {
  const { apiKey, model } = getOpenAiConfig();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      messages: [
        { role: "system", content: "Respondes solo JSON válido para completar fichas de productos de belleza." },
        { role: "user", content: buildPrompt(ctx) },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200) || res.statusText}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI no devolvió contenido");

  const parsed = parseAiJson(content);
  const filtered: AiCompleteSuggestion = {};
  for (const field of ctx.emptyFields) {
    if (field === "description" && parsed.description) filtered.description = parsed.description;
    if (field === "tags" && parsed.tags?.length) filtered.tags = parsed.tags;
    if (field === "emoji" && parsed.emoji) filtered.emoji = parsed.emoji;
    if (field === "badge" && parsed.badge !== undefined) filtered.badge = parsed.badge ?? null;
  }
  return filtered;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
