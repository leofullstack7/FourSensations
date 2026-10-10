import {
  appendProductFollowUp,
  buildOffTopicAdvisorReply,
  empatheticProductIntro,
  FS_WELCOME_MESSAGE,
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
import { POLICY_PAYMENTS_ONE_LINER, POLICY_RETURNS_JULI, POLICY_SHIPPING_ONE_LINER } from "@/lib/storefront-policies";
import { getCatalogKnowledgeBlob, getCatalogProductCopy } from "@/lib/catalog-product-copy";
import { formatJuliCatalogLine, juliCatalogBoost, juliMatchHint } from "@/lib/juli-knowledge";
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
  /** Productos que la asesora recomendó en ese turno (memoria de hilo). */
  productIds?: string[];
};

const GREETINGS = ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "hi", "buen dia"];
const THANKS = ["gracias", "thank", "genial", "perfecto", "listo", "ok gracias", "muchas gracias"];
const SHIPPING = ["envio", "envios", "domicilio", "entrega", "cuanto demora", "llega", "demora el pedido"];
const HUMAN = ["humano", "persona", "asesor", "asesora", "whatsapp", "hablar con alguien", "atencion", "asesoria personal"];
const OFF_TOPIC = ["presidente", "futbol", "bitcoin", "noticias del dia", "resultado del partido"];
const PAYMENTS = ["pago", "pagos", "tarjeta", "efectivo", "mercadopago", "mercado pago", "epayco", "bold", "cuotas"];
const RETURNS = ["devolucion", "devoluciones", "cambio", "garantia", "reembolso"];

/** Conocimiento fijo de la tienda (no está en columnas de producto). */
export const STORE_ADVISOR_KNOWLEDGE = {
  shipping: POLICY_SHIPPING_ONE_LINER,
  payments: POLICY_PAYMENTS_ONE_LINER,
  returns: `${POLICY_RETURNS_JULI} WhatsApp ${WHATSAPP_BUSINESS_DISPLAY}.`,
  whatsapp: `Nuestro WhatsApp de atención es ${WHATSAPP_BUSINESS_DISPLAY}. Escríbenos para pedidos, asesoría, garantía legal o novedades de transporte (no hay cambios por gusto).`,
  scope:
    "Soy Juli, tu aliada de Four Sensations: te escucho y te recomiendo productos propios de la tienda según lo que tu cabello necesita.",
} as const;

const INTENT_SYNONYMS: Record<string, string[]> = {
  "piel seca": ["hidratante", "humectante", "serum", "crema", "balsamo", "cuidado piel", "facial", "resequedad", "reseca", "deshidratada"],
  "piel grasa": ["matificante", "limpiador", "tonico", "control sebo", "cuidado piel", "brillo", "poros"],
  "piel sensible": ["suave", "hipoalergenico", "calmante", "cuidado piel", "irritada", "rojeces"],
  acne: ["acne", "granos", "espinillas", "anti imperfecciones", "limpiador", "poros", "cuidado piel"],
  manchas: ["manchas", "vitamina c", "serum", "claridad", "cuidado piel", "hiperpigmentacion", "manchitas"],
  antiedad: ["antiedad", "arrugas", "lineas de expresion", "retinol", "contorno", "cuidado piel", "flacidez"],
  "cabello seco": ["hidratacion", "nutricion", "acondicionador", "mascarilla", "cuidado capilar", "reseco", "poroso", "dulce renacer", "tentacion nutricion"],
  "cabello danado": ["reparacion", "tratamiento", "keratina", "proteina", "cuidado capilar", "maltratado", "quimico", "puntas abiertas", "proteina 10"],
  "cuero cabelludo": ["caspa", "detox", "grasa", "exfoliante", "scalp", "scrub glow", "secreto de primavera"],
  caida: ["crecimiento", "fortalecedor", "anticaida", "cuidado capilar", "caida del cabello", "alopecia", "shots", "tonico"],
  "cabello rizado": ["rizos", "definicion", "crema para peinar", "cuidado capilar", "ondulado", "rizado"],
  frizz: ["disciplinador", "finalizador", "antifrizz", "cuidado capilar", "encrespamiento", "electrizado", "shine gloss"],
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
    getCatalogKnowledgeBlob(p.name),
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

export function explainProductMatch(product: StoreProduct, queryTokens: Set<string>, rawQuery = ""): string {
  const juliHint = juliMatchHint(product, rawQuery || [...queryTokens].join(" "));
  if (juliHint) return juliHint;

  const copy = getCatalogProductCopy(product.name);
  if (copy?.tagline) return copy.tagline;
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
    score += juliCatalogBoost(query, product);

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
    formatJuliCatalogLine(p),
    p.description ? p.description.slice(0, 120) : "",
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
    id: "hair",
    label: "Cabello seco",
    text: "Tengo el cabello seco, opaco y necesito nutrición",
    searchQuery: "cabello seco opaco poroso nutricion dulce renacer tentacion nutricion",
    intro:
      "El cabello seco pide nutrición de verdad. Te dejo las estrellas de Four Sensations para devolverle suavidad y vida:",
  },
  {
    id: "frizz",
    label: "Frizz",
    text: "Tengo mucho frizz y el cabello rebelde",
    searchQuery: "frizz encrespado shine gloss dulce renacer fantasia natural",
    intro:
      "El frizz se calma con nutrición + un buen finalizador. Mira lo que Juli te arma con productos de la tienda:",
  },
  {
    id: "repair",
    label: "Cabello dañado",
    text: "Mi cabello está dañado por químicos y calor",
    searchQuery: "cabello danado reparacion proteina 10 en 1 dulce renacer shots",
    intro:
      "Cuando hay daño, reconstruimos fibra. Empiezo con la Proteína 10 en 1 y tratamientos propios de Four Sensations:",
  },
  {
    id: "fall",
    label: "Caída",
    text: "Se me está cayendo el cabello y quiero más densidad",
    searchQuery: "caida crecimiento anticaida shots secreto de primavera tonico",
    intro:
      "Para caída y crecimiento trabajo con tónicos y Shots de la casa. Estas son mis recomendadas:",
  },
  {
    id: "scalp",
    label: "Cuero cabelludo",
    text: "Tengo el cuero cabelludo graso y con acumulación",
    searchQuery: "cuero cabelludo graso caspa detox scalp therapy scrub glow",
    intro:
      "Un cuero cabelludo liviano cambia toda la rutina. Te sugiero la línea detox y equilibrio de Four Sensations:",
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
  const top = ranked.slice(0, 6);
  const queryTokens = expandQueryTokens(preset.searchQuery);
  const topScore = top[0]?.score ?? 0;
  const secondScore = top[1]?.score ?? 0;
  const confidence = confidenceFromScore(topScore, secondScore);

  if (top.length > 0 && topScore >= 4) {
    const productHints: Record<string, string> = {};
    for (const { product } of top) {
      productHints[product.id] = explainProductMatch(product, queryTokens, preset.searchQuery);
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
      messages: [{ role: "bot", text: FS_WELCOME_MESSAGE }],
    };
  }

  if (matchesAny(trimmed, GREETINGS) && (options.historyTurns?.length ?? options.history?.length ?? 0) < 2) {
    return {
      confidence: 0,
      engine,
      messages: [
        {
          role: "bot",
          text: "Hola, soy Juli 💜 Cuéntame qué le pasa a tu cabello — sequedad, frizz, caída, cuero cabelludo… — y te armo una recomendación con productos Four Sensations.",
        },
      ],
    };
  }

  if (matchesAny(trimmed, THANKS)) {
    return {
      confidence: 0,
      engine,
      messages: [{ role: "bot", text: "Con gusto ✨ Si quieres, cuéntame otro detalle y afinamos la rutina. O agrégalo al carrito cuando encuentres tu favorito." }],
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
  const top = ranked.slice(0, 6);
  const topScore = top[0]?.score ?? 0;
  const secondScore = top[1]?.score ?? 0;
  const confidence = confidenceFromScore(topScore, secondScore);
  const queryTokens = expandQueryTokens(searchQuery);

  const minScore = products.length > 0 ? 4 : 999;
  const minConfidence = 0.32;

  if (confidence >= minConfidence && topScore >= minScore && top.length > 0) {
    const productHints: Record<string, string> = {};
    for (const { product } of top) {
      productHints[product.id] = explainProductMatch(product, queryTokens, searchQuery);
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
        text: "Aún no atino con un producto exacto 🤔 Cuéntame si es sequedad, frizz, caída o cuero cabelludo — te recomiendo solo lo de Four Sensations.",
        actions: [
          { label: "Buscar en catálogo", kind: "search", query: searchQuery || trimmed },
          { label: "Ver productos", kind: "catalog" },
        ],
      },
      {
        role: "bot",
        text: `Si prefieres, el equipo te orienta por WhatsApp al ${WHATSAPP_BUSINESS_DISPLAY}.`,
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
  note: "Juli usa fichas del catálogo oficial (idealFor, beneficios) más name, tags y descripción. Recomienda solo productos Four Sensations.",
} as const;
