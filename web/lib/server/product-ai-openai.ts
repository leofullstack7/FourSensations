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
  /** Solo contexto: NO copiar a Product.tags */
  menuTagForSubcategory: string | null;
  /** Texto actual en ficha (para reescritura comercial). */
  existingDescription?: string | null;
  /** Reescribir description con tono e-commerce más comercial. */
  rewriteDescriptions?: boolean;
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
  const rewritingDescription =
    ctx.rewriteDescriptions &&
    ctx.emptyFields.includes("description") &&
    Boolean(ctx.existingDescription?.trim());

  const productBlock = `Producto:
- Nombre (contexto principal): ${ctx.name}
- Marca: ${ctx.brand}
- Categoría: ${ctx.categoryLabel} (${ctx.categorySlug})
- Subcategoría: ${ctx.subcategory}
- Precio COP: ${ctx.priceCop}
- Grupo del mega menú (solo referencia, NO usar como tags del producto): ${ctx.menuTagForSubcategory ?? "—"}`;

  if (rewritingDescription) {
    return `Eres copywriter senior de e-commerce de belleza para GinnaBeauty (Colombia).
Tu tarea es REESCRIBIR la descripción del producto para tienda online: más comercial, llamativa y orientada a conversión, como las fichas de marcas profesionales en internet.
Responde ÚNICAMENTE JSON válido (sin markdown) con las claves: ${fields}

${productBlock}

Descripción actual (usa como referencia de qué es el producto; NO copies frases literales):
"""
${ctx.existingDescription!.trim().slice(0, 2000)}
"""

Reglas para la NUEVA description:
- 2-4 frases en español (Colombia), tono premium, cercano y persuasivo.
- Resalta beneficios, para quién es y cómo se usa, según nombre, marca y categoría.
- Estilo ficha e-commerce profesional (claro, escaneable, despertar deseo de compra).
- Mantén veracidad: no inventes ingredientes, certificaciones ni resultados clínicos no inferibles del nombre/categoría.
- Debe ser claramente MEJOR y distinta a la descripción anterior (no parafraseo mínimo).

Otros campos si aplican:
- tags: 3-8 etiquetas de búsqueda del producto (NO etiqueta de menú).
- emoji: un emoji acorde.
- badge: "new"|"hot"|"sale"|"best"|null

JSON ejemplo:
{"description":"…"}`;
  }

  return `Eres redactora de e-commerce de cosméticos para GinnaBeauty (Colombia).
Completa SOLO los campos vacíos del producto. Usa el NOMBRE del producto como contexto principal (tipo, línea, tono, formato, beneficios implícitos); refuerza con categoría y subcategoría.
Responde ÚNICAMENTE JSON válido (sin markdown) con las claves que correspondan a campos vacíos.

${productBlock}

Campos a completar: ${fields}

Reglas:
- description: 2-4 frases en español alineadas con el nombre del producto, beneficios claros, tono premium y cercano, estilo tienda online. Puedes inferir uso y tipo desde el nombre; no inventes ingredientes específicos que no sugiera el nombre.
- tags: array de 3-8 etiquetas PROPIAS del producto en español, derivadas del nombre y la ficha (intención de búsqueda: hidratante, mate, reparación, vitamina c…). NO uses el nombre del grupo de menú ni la etiqueta dorada del mega menú.
- emoji: un solo emoji que represente el producto según su nombre y categoría (string de 1 emoji).
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
  const rewriting =
    ctx.rewriteDescriptions && ctx.emptyFields.includes("description") && Boolean(ctx.existingDescription?.trim());

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: rewriting ? 0.62 : 0.55,
      messages: [
        {
          role: "system",
          content: rewriting
            ? "Respondes solo JSON válido. Reescribes descripciones comerciales para e-commerce de belleza en Colombia."
            : "Respondes solo JSON válido para completar fichas de productos de belleza.",
        },
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
