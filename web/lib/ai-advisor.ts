import { getCategoryLabel } from "@/lib/category-labels";
import type { StoreProduct } from "@/lib/types/product";

export type AiChatRole = "bot" | "user";

export type AiChatMessage = {
  id: string;
  role: AiChatRole;
  text: string;
  productIds?: string[];
  action?: { label: string; kind: "whatsapp" | "search"; query?: string };
};

export type AiAdvisorReply = {
  messages: Omit<AiChatMessage, "id">[];
  confidence: number;
};

const GREETINGS = ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "hey", "hi"];
const THANKS = ["gracias", "thank", "genial", "perfecto", "listo", "ok gracias"];
const SHIPPING = ["envio", "envios", "domicilio", "entrega", "cuanto demora", "llega"];
const HUMAN = ["humano", "persona", "asesor", "asesora", "whatsapp", "hablar con alguien", "atencion"];
const OFF_TOPIC = ["presidente", "futbol", "clima", "politica", "bitcoin", "noticias"];

const INTENT_SYNONYMS: Record<string, string[]> = {
  "piel seca": ["hidratante", "serum", "crema", "humectante", "cuidado piel"],
  "piel grasa": ["matificante", "limpiador", "tonico", "cuidado piel"],
  acne: ["acne", "anti imperfecciones", "limpiador", "cuidado piel"],
  manchas: ["manchas", "vitamina c", "serum", "cuidado piel"],
  antiedad: ["antiedad", "retinol", "serum", "contorno", "cuidado piel"],
  "cabello seco": ["hidratacion", "reparacion", "acondicionador", "mascarilla", "cuidado capilar"],
  "cabello danado": ["reparacion", "tratamiento", "keratina", "cuidado capilar"],
  caida: ["crecimiento", "fortalecedor", "cuidado capilar"],
  frizz: ["disciplinador", "finalizador", "cuidado capilar"],
  "maquillaje natural": ["base", "rubor", "glow", "maquillaje"],
  labios: ["labial", "gloss", "maquillaje"],
  ojos: ["mascara", "sombras", "delineador", "maquillaje"],
  regalo: ["combo", "kit", "regalo"],
  hombre: ["hombres", "barba", "afeitado"],
  unas: ["esmalte", "unas", "sempermanente"],
  tinte: ["tinte", "tintes", "coloracion"],
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

function productSearchBlob(p: StoreProduct): string {
  return normalizeAdvisorText(
    [p.name, p.brand, p.category, getCategoryLabel(p.category), p.subcategory, p.description, ...p.tags].join(" "),
  );
}

export function scoreProductsForQuery(products: StoreProduct[], rawQuery: string): { product: StoreProduct; score: number }[] {
  const query = normalizeAdvisorText(rawQuery);
  if (!query) return [];

  const queryTokens = tokenize(query);
  const expandedTokens = new Set(queryTokens);

  for (const [phrase, synonyms] of Object.entries(INTENT_SYNONYMS)) {
    if (query.includes(normalizeAdvisorText(phrase))) {
      synonyms.forEach((s) => tokenize(s).forEach((t) => expandedTokens.add(t)));
    }
  }

  const scored: { product: StoreProduct; score: number }[] = [];

  for (const product of products) {
    const blob = productSearchBlob(product);
    const nameNorm = normalizeAdvisorText(product.name);
    let score = 0;

    if (nameNorm.includes(query)) score += 12;
    if (blob.includes(query)) score += 6;

    for (const token of expandedTokens) {
      if (token.length < 2) continue;
      if (nameNorm.includes(token)) score += 4;
      if (normalizeAdvisorText(product.subcategory).includes(token)) score += 3;
      if (product.tags.some((t) => normalizeAdvisorText(t).includes(token))) score += 3;
      if (blob.includes(token)) score += 1;
    }

    if (score > 0) scored.push({ product, score });
  }

  return scored.sort((a, b) => b.score - a.score);
}

function matchesAny(text: string, phrases: string[]): boolean {
  const n = normalizeAdvisorText(text);
  return phrases.some((p) => n.includes(normalizeAdvisorText(p)));
}

function confidenceFromScore(topScore: number, secondScore: number): number {
  if (topScore <= 0) return 0;
  const gap = topScore - secondScore;
  const base = Math.min(topScore / 18, 1);
  const gapBoost = gap >= 4 ? 0.15 : gap >= 2 ? 0.08 : 0;
  return Math.min(0.98, base + gapBoost);
}

export function buildAdvisorReply(input: string, products: StoreProduct[]): AiAdvisorReply {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      confidence: 0,
      messages: [{ role: "bot", text: "Cuéntame qué buscas — piel, cabello, maquillaje o un regalo ✨" }],
    };
  }

  if (matchesAny(trimmed, GREETINGS)) {
    return {
      confidence: 0,
      messages: [
        {
          role: "bot",
          text: "¡Hola! Soy Ginna AI 💫 Cuéntame qué quieres cuidar hoy o elige una sugerencia abajo. No adivino todo, pero en belleza voy muy bien.",
        },
      ],
    };
  }

  if (matchesAny(trimmed, THANKS)) {
    return {
      confidence: 0,
      messages: [{ role: "bot", text: "Con gusto ✨ Si quieres seguir explorando, escríbeme otro detalle o abre el catálogo." }],
    };
  }

  if (matchesAny(trimmed, SHIPPING)) {
    return {
      confidence: 0,
      messages: [
        {
          role: "bot",
          text: "Enviamos a toda Colombia 🚚 Compras desde $150.000 tienen envío gratis. Los tiempos dependen de tu ciudad — en checkout ves la zona exacta.",
        },
      ],
    };
  }

  if (matchesAny(trimmed, HUMAN)) {
    return {
      confidence: 0,
      messages: [
        {
          role: "bot",
          text: "Para algo muy personalizado, nuestro equipo humano te atiende mejor por WhatsApp 💬",
          action: { label: "Escríbenos por WhatsApp", kind: "whatsapp" },
        },
      ],
    };
  }

  if (matchesAny(trimmed, OFF_TOPIC)) {
    return {
      confidence: 0,
      messages: [
        {
          role: "bot",
          text: "Eso se me escapa 😅 Soy especialista en belleza. ¿Probamos con rutina de piel, cabello, maquillaje o tintes?",
        },
      ],
    };
  }

  const ranked = scoreProductsForQuery(products, trimmed);
  const top = ranked.slice(0, 3);
  const topScore = top[0]?.score ?? 0;
  const secondScore = top[1]?.score ?? 0;
  const confidence = confidenceFromScore(topScore, secondScore);

  if (confidence >= 0.45 && top.length > 0) {
    return {
      confidence,
      messages: [
        {
          role: "bot",
          text:
            confidence >= 0.7
              ? `Encontré opciones que encajan con lo que me dices 👇 Revisa estas ${top.length} recomendaciones curadas:`
              : `Creo que esto puede servirte (confianza media). Mira estas opciones y dime si afinamos más:`,
          productIds: top.map((r) => r.product.id),
        },
      ],
    };
  }

  return {
    confidence: 0,
    messages: [
      {
        role: "bot",
        text: "No tengo algo exacto en catálogo con eso todavía 🤔 Prueba con más detalle (ej. «piel seca», «cabello dañado») o déjame abrirte la búsqueda:",
        action: { label: "Buscar en catálogo", kind: "search", query: trimmed },
      },
      {
        role: "bot",
        text: "Si prefieres, una asesora humana te orienta en WhatsApp.",
        action: { label: "Hablar con el equipo", kind: "whatsapp" },
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
  note: "Hoy el asesor usa name, brand, category, subcategory, tags y description. Sin tags ni descripción rica, la confianza baja.",
} as const;
