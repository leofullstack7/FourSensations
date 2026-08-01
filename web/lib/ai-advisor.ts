import {
  appendProductFollowUp,
  buildOffTopicAdvisorReply,
  empatheticProductIntro,
  GINNA_WELCOME_MESSAGE,
  isLikelyOffTopicMessage,
} from "@/lib/ai-advisor-persona";
import {
  buildAdvisorSearchQueryFromTurns,
  isFollowUpMessage,
  resolveEffectiveUserMessage,
} from "@/lib/ai-advisor-context";
import { getCategoryLabel } from "@/lib/category-labels";
import { TINTES_CATEGORY_SLUG } from "@/lib/bulk-import/tintes";
import { WHATSAPP_BUSINESS_DISPLAY } from "@/lib/storefront-contact";
import type { StoreProduct } from "@/lib/types/product";

export type AiChatRole = "bot" | "user";

export type AiAdvisorAction = {
  label: string;
  kind: "whatsapp" | "search" | "catalog" | "cart" | "wishlist";
  query?: string;
  productId?: string;
};

export type AiChatMessage = {
  id: string;
  role: AiChatRole;
  text: string;
  productIds?: string[];
  /** Breve razón por producto (id → texto). */
  productHints?: Record<string, string>;
  action?: AiAdvisorAction;
  actions?: AiAdvisorAction[];
};

export type AiAdvisorReply = {
  messages: Omit<AiChatMessage, "id">[];
  confidence: number;
  /** Motor usado (útil para telemetría). */
  engine?: "rules" | "openai";
};

export type AdvisorHistoryTurn = {
  role: AiChatRole;
  text: string;
  /** Productos que Ginna recomendó en ese turno (memoria de hilo). */
  productIds?: string[];
};

const GREETINGS = ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "hi", "buen dia"];
const THANKS = ["gracias", "thank", "genial", "perfecto", "listo", "ok gracias", "muchas gracias"];
const SHIPPING = ["envio", "envios", "domicilio", "entrega", "cuanto demora", "llega", "demora el pedido"];
const HUMAN = ["humano", "persona", "asesor", "asesora", "whatsapp", "hablar con alguien", "atencion", "asesoria personal"];
const OFF_TOPIC = ["presidente", "futbol", "bitcoin", "noticias del dia", "resultado del partido"];
const PAYMENTS = ["pago", "pagos", "tarjeta", "efectivo", "epayco", "bold", "cuotas"];
const RETURNS = ["devolucion", "devoluciones", "cambio", "garantia", "reembolso"];

/** Conocimiento fijo de la tienda (no está en columnas de producto). */
export const STORE_ADVISOR_KNOWLEDGE = {
  shipping:
    "Enviamos a toda Colombia. Compras desde $150.000 COP tienen envío gratis. El tiempo de entrega depende de tu ciudad; lo confirmas en checkout.",
  payments:
    "Aceptamos pagos seguros en línea (ePayco, Bold y tarjetas). El total final y opciones disponibles aparecen al finalizar la compra.",
  returns: `Para cambios o garantías escríbenos por WhatsApp al ${WHATSAPP_BUSINESS_DISPLAY} con tu número de pedido; el equipo te orienta según el producto.`,
  whatsapp: `Nuestro WhatsApp de atención es ${WHATSAPP_BUSINESS_DISPLAY}. Escríbenos para pedidos, asesoría personalizada, cambios o garantías.`,
  scope:
    "Soy Ginna AI, asesora de GinnaBeauty: te ayudo con tu cuidado personal y te recomiendo productos de calidad para llevar al carrito o favoritos.",
} as const;

const INTENT_SYNONYMS: Record<string, string[]> = {
  "piel seca": ["hidratante", "humectante", "serum", "crema", "balsamo", "cuidado piel", "facial", "resequedad", "reseca", "deshidratada"],
  "piel grasa": ["matificante", "limpiador", "tonico", "control sebo", "cuidado piel", "brillo", "poros"],
  "piel sensible": ["suave", "hipoalergenico", "calmante", "cuidado piel", "irritada", "rojeces"],
  acne: ["acne", "granos", "espinillas", "anti imperfecciones", "limpiador", "poros", "cuidado piel"],
  manchas: ["manchas", "vitamina c", "serum", "claridad", "cuidado piel", "hiperpigmentacion", "manchitas"],
  antiedad: ["antiedad", "arrugas", "lineas de expresion", "retinol", "contorno", "cuidado piel", "flacidez"],
  "cabello seco": ["hidratacion", "nutricion", "acondicionador", "mascarilla", "cuidado capilar", "reseco", "poroso"],
  "cabello danado": ["reparacion", "tratamiento", "keratina", "bond", "cuidado capilar", "maltratado", "quimico", "puntas abiertas"],
  "cabello rizado": ["rizos", "definicion", "crema para peinar", "cuidado capilar", "ondulado", "rizado"],
  caida: ["crecimiento", "fortalecedor", "anticaida", "cuidado capilar", "caida del cabello", "alopecia"],
  frizz: ["disciplinador", "finalizador", "antifrizz", "cuidado capilar", "encrespamiento", "electrizado"],
  "cabello teñido": ["color", "matiz", "proteccion color", "cuidado capilar", "teñido", "tenido", "decolorado"],
  "maquillaje natural": ["base", "rubor", "glow", "maquillaje", "look natural", "no makeup", "luminoso"],
  labios: ["labial", "gloss", "balsamo labial", "maquillaje", "tinte labios"],
  ojos: ["mascara", "sombras", "delineador", "cejas", "maquillaje", "pestañas", "pestana"],
  regalo: ["combo", "kit", "regalo", "detalle", "sorpresa", "obsequio"],
  hombre: ["hombres", "barba", "afeitado", "after shave", "caballero"],
  unas: ["esmalte", "unas", "uñas", "sempermanente", "manicure", "pedicure"],
  tinte: ["tinte", "tintes", "tinturo", "tinturar", "tintura", "coloracion", "tono", "igora", "canas", "cobertura", "pintar el pelo", "teñir", "tenir"],
  rubio: ["rubio", "rubia", "decoloracion", "matiz", "tintes", "platino", "dorado"],
  castano: ["castano", "castaño", "cobertura", "tintes", "marron", "chocolate"],
  economico: ["economico", "económico", "barato", "precio bajo", "accesible", "oferta"],
};

/** Términos que sugieren una categoría del catálogo (slug → palabras clave). */
const CATEGORY_TERMS: Record<string, string[]> = {
  "cuidado-piel": ["piel", "facial", "rostro", "serum", "crema", "hidratante", "limpiador", "tonico", "spf", "contorno"],
  "cuidado-capilar": ["cabello", "capilar", "shampoo", "champu", "acondicionador", "mascarilla capilar", "frizz"],
  maquillaje: ["maquillaje", "base", "rubor", "labial", "sombras", "delineador", "mascara", "gloss"],
  tintes: ["tinte", "tintes", "coloracion", "igora", "tono", "canas", "matiz", "decoloracion"],
  unas: ["unas", "esmalte", "manicure", "sempermanente"],
  hombres: ["hombre", "hombres", "barba", "afeitado"],
  accesorios: ["accesorio", "brocha", "pinza", "diadema"],
  mayorista: ["mayorista", "mayoreo", "volumen", "kit mayorista"],
};

export function normalizeAdvisorText(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeAdvisorText(value)
    .split(/[\s,.;:!?¿¡/+-]+/)
    .filter((t) => t.length > 1);
}

/** Combina el hilo completo de la conversación para búsqueda contextual. */
export function buildAdvisorSearchQuery(current: string, history?: string[]): string {
  const turns: AdvisorHistoryTurn[] = (history ?? []).map((text) => ({ role: "user" as const, text }));
  return buildAdvisorSearchQueryFromTurns(turns, current);
}

export function buildAdvisorSearchQueryWithHistory(
  current: string,
  historyTurns: AdvisorHistoryTurn[],
): string {
  let prior = historyTurns;
  const last = prior[prior.length - 1];
  if (last?.role === "user" && normalizeAdvisorText(last.text) === normalizeAdvisorText(current.trim())) {
    prior = prior.slice(0, -1);
  }
  const effective = resolveEffectiveUserMessage(current, [...prior, { role: "user", text: current }]);
  return buildAdvisorSearchQueryFromTurns(prior, effective);
}

export function productSearchBlob(p: StoreProduct): string {
  const parts = [
    p.name,
    p.brand,
    p.category,
    getCategoryLabel(p.category),
    p.subcategory,
    p.description,
    ...p.tags,
    p.tintLevel,
    p.tintGroup,
    p.tintFamily,
    p.tintType,
    p.badge ?? "",
  ];
  return normalizeAdvisorText(parts.filter(Boolean).join(" "));
}

function expandQueryTokens(rawQuery: string): Set<string> {
  const query = normalizeAdvisorText(rawQuery);
  const expanded = new Set(tokenize(query));

  for (const [phrase, synonyms] of Object.entries(INTENT_SYNONYMS)) {
    if (query.includes(normalizeAdvisorText(phrase))) {
      synonyms.forEach((s) => tokenize(s).forEach((t) => expanded.add(t)));
    }
  }

  for (const tokens of Object.values(CATEGORY_TERMS)) {
    for (const term of tokens) {
      if (query.includes(normalizeAdvisorText(term))) {
        tokenize(term).forEach((t) => expanded.add(t));
      }
    }
  }

  return expanded;
}

function detectCategorySlugs(query: string): Set<string> {
  const n = normalizeAdvisorText(query);
  const slugs = new Set<string>();
  for (const [slug, terms] of Object.entries(CATEGORY_TERMS)) {
    if (terms.some((t) => n.includes(normalizeAdvisorText(t)))) slugs.add(slug);
  }
  return slugs;
}

function detectBrandBoost(query: string, products: StoreProduct[]): string | null {
  const n = normalizeAdvisorText(query);
  const brands = [...new Set(products.map((p) => p.brand.trim()).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  for (const brand of brands) {
    const bn = normalizeAdvisorText(brand);
    if (bn.length >= 3 && n.includes(bn)) return brand;
  }
  return null;
}

function parseMaxPriceCop(query: string): number | null {
  const n = normalizeAdvisorText(query);
  const m = n.match(/(?:menos de|hasta|maximo|máximo|bajo)\s*\$?\s*(\d[\d.]*)/);
  if (!m) return null;
  const num = Number(m[1]!.replace(/\./g, ""));
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function explainProductMatch(product: StoreProduct, queryTokens: Set<string>): string {
  const matchedTags = product.tags.filter((t) => {
    const tn = normalizeAdvisorText(t);
    return [...queryTokens].some((tok) => tok.length >= 3 && (tn.includes(tok) || tok.includes(tn)));
  });
  if (matchedTags.length > 0) return matchedTags.slice(0, 2).join(" · ");

  const sub = normalizeAdvisorText(product.subcategory);
  if ([...queryTokens].some((t) => t.length >= 3 && sub.includes(t))) return product.subcategory;

  if (product.tintLevel && [...queryTokens].some((t) => normalizeAdvisorText(product.tintLevel!).includes(t))) {
    return `Nivel ${product.tintLevel}`;
  }

  if (product.category === TINTES_CATEGORY_SLUG && (product.tintFamily || product.tintType)) {
    return [product.tintFamily, product.tintType].filter(Boolean).join(" · ");
  }

  return getCategoryLabel(product.category);
}

export function scoreProductsForQuery(
  products: StoreProduct[],
  rawQuery: string,
): { product: StoreProduct; score: number }[] {
  const query = normalizeAdvisorText(rawQuery);
  if (!query || products.length === 0) return [];

  const expandedTokens = expandQueryTokens(query);
  const categoryHints = detectCategorySlugs(query);
  const brandHint = detectBrandBoost(query, products);
  const maxPrice = parseMaxPriceCop(query);
  const scored: { product: StoreProduct; score: number }[] = [];

  for (const product of products) {
    const blob = productSearchBlob(product);
    const nameNorm = normalizeAdvisorText(product.name);
    const brandNorm = normalizeAdvisorText(product.brand);
    let score = 0;

    if (nameNorm.includes(query)) score += 14;
    if (blob.includes(query)) score += 8;
    if (brandHint && product.brand === brandHint) score += 10;

    if (categoryHints.has(product.category)) score += 5;
    if (maxPrice != null && product.price <= maxPrice) score += 3;
    if (maxPrice != null && product.price > maxPrice * 1.15) score -= 4;

    for (const token of expandedTokens) {
      if (token.length < 2) continue;
      if (nameNorm.includes(token)) score += 5;
      if (brandNorm.includes(token)) score += 4;
      if (normalizeAdvisorText(product.subcategory).includes(token)) score += 3;
      if (product.tags.some((t) => normalizeAdvisorText(t).includes(token))) score += 7;
      if (product.tintLevel && normalizeAdvisorText(product.tintLevel).includes(token)) score += 8;
      if (product.tintGroup && normalizeAdvisorText(product.tintGroup).includes(token)) score += 6;
      if (product.tintFamily && normalizeAdvisorText(product.tintFamily).includes(token)) score += 6;
      if (product.tintType && normalizeAdvisorText(product.tintType).includes(token)) score += 6;
      if (blob.includes(token)) score += 1;
    }

    if (product.featuredInHome) score += 1;
    if (product.rating >= 4.5 && product.reviews >= 3) score += 0.5;

    if (score > 0) scored.push({ product, score });
  }

  return scored.sort((a, b) => b.score - a.score);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Coincidencia por frase completa o palabra (evita que «hi» dispare en «hidratación»). */
function matchesIntentPhrase(text: string, phrase: string): boolean {
  const n = normalizeAdvisorText(text);
  const p = normalizeAdvisorText(phrase);
  if (!p || !n) return false;

  if (n === p) return true;

  if (p.includes(" ") || p.length >= 5) {
    return n.includes(p);
  }

  const re = new RegExp(`(?:^|[\\s,.;:!?¿¡/+-])${escapeRegExp(p)}(?:$|[\\s,.;:!?¿¡/+-])`);
  return re.test(n);
}

function matchesAny(text: string, phrases: string[]): boolean {
  return phrases.some((p) => matchesIntentPhrase(text, p));
}

function confidenceFromScore(topScore: number, secondScore: number): number {
  if (topScore <= 0) return 0;
  const gap = topScore - secondScore;
  const base = Math.min(topScore / 14, 1);
  const gapBoost = gap >= 6 ? 0.18 : gap >= 3 ? 0.1 : gap >= 1 ? 0.04 : 0;
  return Math.min(0.98, base + gapBoost);
}

function isCannedIntent(text: string): boolean {
  return (
    matchesAny(text, GREETINGS) ||
    matchesAny(text, THANKS) ||
    matchesAny(text, SHIPPING) ||
    matchesAny(text, PAYMENTS) ||
    matchesAny(text, RETURNS) ||
    matchesAny(text, HUMAN) ||
    matchesAny(text, OFF_TOPIC)
  );
}

/** ¿Conviene usar LLM para este mensaje? */
export function shouldUseAdvisorLlm(text: string, historyTurns?: AdvisorHistoryTurn[]): boolean {
  const t = text.trim();
  if (!t || isCannedIntent(t)) return false;
  if (resolveAdvisorQuickPromptId(t) && (historyTurns?.length ?? 0) < 2) return false;
  if (historyTurns && historyTurns.length >= 2 && isFollowUpMessage(t, historyTurns)) return true;
  if (historyTurns && historyTurns.length >= 6) return true;
  return true;
}

export function formatProductForAdvisorContext(p: StoreProduct): string {
  const bits = [
    `[${p.id}]`,
    p.name,
    p.brand,
    `${getCategoryLabel(p.category)} / ${p.subcategory}`,
    `$${p.price.toLocaleString("es-CO")} COP`,
    p.tags.length ? `tags: ${p.tags.join(", ")}` : "",
    p.description ? p.description.slice(0, 96) : "",
    p.tintLevel ? `nivel: ${p.tintLevel}` : "",
    p.tintGroup ? `grupo: ${p.tintGroup}` : "",
    p.tintFamily ? `familia: ${p.tintFamily}` : "",
    p.tintType ? `linea: ${p.tintType}` : "",
  ];
  return bits.filter(Boolean).join(" | ");
}

export type BuildAdvisorOptions = {
  /** @deprecated Usar historyTurns para memoria completa del hilo. */
  history?: string[];
  historyTurns?: AdvisorHistoryTurn[];
  engine?: AiAdvisorReply["engine"];
};

/** Preguntas rápidas del chat — una sola fuente para UI y motor rules. */
export const ADVISOR_QUICK_PROMPTS = [
  {
    id: "skin",
    label: "Piel seca",
    text: "Tengo la piel seca y busco hidratación facial",
    searchQuery: "piel seca hidratacion facial humectante crema serum",
    intro:
      "La piel seca necesita hidratación de verdad — en GinnaBeauty tenemos opciones profesionales para devolverle confort y luminosidad. Mira estas:",
  },
  {
    id: "hair",
    label: "Cabello dañado",
    text: "Mi cabello está dañado y necesito reparación",
    searchQuery: "cabello danado reparacion tratamiento mascarilla keratina",
    intro:
      "El cabello maltratado se recupera con buena nutrición — te dejo tratamientos de GinnaBeauty que nuestras clientas aman:",
  },
  {
    id: "makeup",
    label: "Look natural",
    text: "Quiero maquillaje natural con glow",
    searchQuery: "maquillaje natural glow base rubor luminoso",
    intro:
      "Para un look natural con glow, estas piezas de la tienda te dan luminosidad sin cargar — échales un ojo:",
  },
  {
    id: "tint",
    label: "Tintes",
    text: "Busco tinte para cubrir canas en tono castaño",
    searchQuery: "tinte castano canas cobertura coloracion igora",
    intro:
      "Para cubrir canas en castaño con acabado de salón, estas tinturas profesionales de GinnaBeauty son excelentes opciones:",
  },
  {
    id: "gift",
    label: "Regalo",
    text: "Busco un regalo de belleza especial",
    searchQuery: "regalo kit combo detalle best seller",
    intro:
      "Un regalo de belleza siempre emociona — estas opciones de la tienda son perfectas para sorprender:",
  },
] as const;

export type AdvisorQuickPromptId = (typeof ADVISOR_QUICK_PROMPTS)[number]["id"];

const QUICK_PROMPT_TEXT_TO_ID = new Map(
  ADVISOR_QUICK_PROMPTS.map((p) => [normalizeAdvisorText(p.text), p.id]),
);

/** Identifica si el mensaje coincide con un chip predeterminado. */
export function resolveAdvisorQuickPromptId(text: string): AdvisorQuickPromptId | null {
  const n = normalizeAdvisorText(text);
  return QUICK_PROMPT_TEXT_TO_ID.get(n) ?? null;
}

function getQuickPromptConfig(id: AdvisorQuickPromptId) {
  return ADVISOR_QUICK_PROMPTS.find((p) => p.id === id)!;
}

/** Respuesta instantánea para chips (sin OpenAI, sin API). */
export function buildAdvisorReplyForQuickPrompt(
  promptId: AdvisorQuickPromptId,
  products: StoreProduct[],
  historyTurns: AdvisorHistoryTurn[] = [],
): AiAdvisorReply {
  if (historyTurns.length >= 2) {
    const preset = getQuickPromptConfig(promptId);
    return buildAdvisorReply(preset.text, products, { historyTurns, engine: "rules" });
  }

  const preset = getQuickPromptConfig(promptId);
  const ranked = scoreProductsForQuery(products, preset.searchQuery);
  const top = ranked.slice(0, 3);
  const queryTokens = expandQueryTokens(preset.searchQuery);
  const topScore = top[0]?.score ?? 0;
  const secondScore = top[1]?.score ?? 0;
  const confidence = confidenceFromScore(topScore, secondScore);

  if (top.length > 0 && topScore >= 4) {
    const productHints: Record<string, string> = {};
    for (const { product } of top) {
      productHints[product.id] = explainProductMatch(product, queryTokens);
    }
    return {
      confidence: Math.max(confidence, 0.72),
      engine: "rules",
      messages: appendProductFollowUp([
        {
          role: "bot",
          text: preset.intro,
          productIds: top.map((r) => r.product.id),
          productHints,
        },
      ]),
    };
  }

  return buildAdvisorReply(preset.text, products, { engine: "rules" });
}

/** Umbral: por encima, las reglas bastan y no hace falta LLM. */
export const ADVISOR_RULES_LLM_THRESHOLD = 0.45;

export function buildAdvisorReply(
  input: string,
  products: StoreProduct[],
  options: BuildAdvisorOptions = {},
): AiAdvisorReply {
  const trimmed = input.trim();
  const engine = options.engine ?? "rules";

  if (!trimmed) {
    return {
      confidence: 0,
      engine,
      messages: [{ role: "bot", text: GINNA_WELCOME_MESSAGE }],
    };
  }

  if (matchesAny(trimmed, GREETINGS) && (options.historyTurns?.length ?? options.history?.length ?? 0) < 2) {
    return {
      confidence: 0,
      engine,
      messages: [
        {
          role: "bot",
          text: "¡Hola! Qué gusto saludarte 💫 Soy asesora de GinnaBeauty. Cuéntame qué te preocupa de tu piel, cabello, maquillaje o tintes — te recomiendo productos y los puedes llevar al carrito al instante.",
        },
      ],
    };
  }

  if (matchesAny(trimmed, THANKS)) {
    return {
      confidence: 0,
      engine,
      messages: [{ role: "bot", text: "Con gusto ✨ Si quieres seguir, cuéntame otro detalle de tu rutina o agrégalo al carrito cuando encuentres tu favorito." }],
    };
  }

  if (matchesAny(trimmed, SHIPPING)) {
    return {
      confidence: 0,
      engine,
      messages: [{ role: "bot", text: `${STORE_ADVISOR_KNOWLEDGE.shipping} 🚚` }],
    };
  }

  if (matchesAny(trimmed, PAYMENTS)) {
    return {
      confidence: 0,
      engine,
      messages: [{ role: "bot", text: STORE_ADVISOR_KNOWLEDGE.payments }],
    };
  }

  if (matchesAny(trimmed, RETURNS)) {
    return {
      confidence: 0,
      engine,
      messages: [
        {
          role: "bot",
          text: STORE_ADVISOR_KNOWLEDGE.returns,
          action: { label: "Escríbenos por WhatsApp", kind: "whatsapp" },
        },
      ],
    };
  }

  if (matchesAny(trimmed, HUMAN)) {
    return {
      confidence: 0,
      engine,
      messages: [
        {
          role: "bot",
          text: `${STORE_ADVISOR_KNOWLEDGE.whatsapp} 💬`,
          action: { label: "Escríbenos por WhatsApp", kind: "whatsapp" },
        },
      ],
    };
  }

  const historyTurns = options.historyTurns ?? [];

  if (matchesAny(trimmed, OFF_TOPIC) || isLikelyOffTopicMessage(trimmed, historyTurns)) {
    return buildOffTopicAdvisorReply();
  }

  const searchQuery =
    historyTurns.length > 0
      ? buildAdvisorSearchQueryWithHistory(trimmed, historyTurns)
      : buildAdvisorSearchQuery(trimmed, options.history?.slice(0, -1));
  const ranked = scoreProductsForQuery(products, searchQuery);
  const top = ranked.slice(0, 3);
  const topScore = top[0]?.score ?? 0;
  const secondScore = top[1]?.score ?? 0;
  const confidence = confidenceFromScore(topScore, secondScore);
  const queryTokens = expandQueryTokens(searchQuery);

  const minScore = products.length > 0 ? 4 : 999;
  const minConfidence = 0.32;

  if (confidence >= minConfidence && topScore >= minScore && top.length > 0) {
    const productHints: Record<string, string> = {};
    for (const { product } of top) {
      productHints[product.id] = explainProductMatch(product, queryTokens);
    }

    const intro = empatheticProductIntro(
      historyTurns,
      historyTurns.length >= 2 && isFollowUpMessage(trimmed, historyTurns),
      trimmed,
    );

    return {
      confidence,
      engine,
      messages: appendProductFollowUp([
        {
          role: "bot",
          text: intro,
          productIds: top.map((r) => r.product.id),
          productHints,
        },
      ]),
    };
  }

  if (products.length === 0) {
    return {
      confidence: 0,
      engine,
      messages: [
        {
          role: "bot",
          text: "Estoy cargando el catálogo… intenta de nuevo en un momento o usa la búsqueda general 🔍",
          action: { label: "Abrir búsqueda", kind: "search", query: trimmed },
        },
      ],
    };
  }

  return {
    confidence: 0,
    engine,
    messages: [
      {
        role: "bot",
        text: "No encuentro algo exacto en catálogo 🤔 Cuéntame un poco más tu preocupación (tipo de piel, cabello, tono…) o explora la tienda — tenemos marcas de calidad profesional:",
        actions: [
          { label: "Buscar en catálogo", kind: "search", query: searchQuery || trimmed },
          { label: "Ver productos", kind: "catalog" },
        ],
      },
      {
        role: "bot",
        text: `Si prefieres, una asesora humana te orienta por WhatsApp al ${WHATSAPP_BUSINESS_DISPLAY}.`,
        action: { label: "Escríbenos por WhatsApp", kind: "whatsapp" },
      },
    ],
  };
}

export const AI_PRODUCT_ATTRIBUTE_GUIDE = {
  essentialToday: [
    "name — nombre claro con tipo de producto",
    "category + subcategory — alineados al menú de la tienda",
    "description — beneficios, para quién es y cómo se usa (2–4 frases)",
    "tags — palabras de intención: hidratante, reparación, vegano, mate, etc.",
  ],
  recommendedNext: [
    "beneficios[] — ej. «Hidrata 24h», «Reduce frizz»",
    "preocupaciones[] — ej. piel seca, cabello teñido, acné",
    "tipoPiel / tipoCabello — seco, graso, mixto, rizado…",
    "ingredientesClave[] — vitamina C, keratina, ácido hialurónico",
    "publico — mujer, hombre, unisex",
    "momentoUso — día, noche, post-ducha",
  ],
  tintes: ["tintFamily", "tintType", "tintLevel", "tintGroup"],
  note: "El asesor usa name, brand, category, subcategory, tags, description y campos de tinte. Enriquece fichas con IA en admin para mejores respuestas.",
} as const;
