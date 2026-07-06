import type { AdvisorHistoryTurn } from "@/lib/ai-advisor";

function normalizeAdvisorText(value: string): string {
  return value
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const ADVISOR_MAX_TURNS = 24;

/** Estado inferido de la conversación (memoria de hilo). */
export type AdvisorSessionState = {
  concerns: string[];
  categorySlugs: string[];
  brands: string[];
  maxPriceCop: number | null;
  lastProductIds: string[];
  turnCount: number;
};

const FOLLOW_UP_STARTERS = [
  "y ",
  "tambien ",
  "también ",
  "pero ",
  "aunque ",
  "solo ",
  "sólo ",
  "mas ",
  "más ",
  "menos ",
  "algo ",
  "otro ",
  "otra ",
  "el ",
  "la ",
  "los ",
  "las ",
  "un ",
  "una ",
  "mejor ",
  "prefiero ",
  "quiero ",
  "busco ",
  "necesito ",
  "dame ",
  "muestrame ",
  "muéstrame ",
  "enseñame ",
  "enséñame ",
  "que ",
  "qué ",
  "cual ",
  "cuál ",
  "para ",
  "con ",
  "sin ",
  "no ",
];

const AFFIRMATIONS = ["si", "sí", "ok", "dale", "claro", "exacto", "eso", "perfecto", "listo", "bueno", "vale"];

const STRONG_INTENT_MARKERS = [
  "piel",
  "cabello",
  "capilar",
  "maquillaje",
  "tinte",
  "tintes",
  "canas",
  "rubio",
  "castano",
  "castaño",
  "regalo",
  "shampoo",
  "champu",
  "serum",
  "crema",
  "labial",
  "base",
  "igora",
  "hidrat",
  "repar",
  "acne",
  "mancha",
  "frizz",
  "rizo",
  "unas",
  "uñas",
  "envio",
  "envío",
  "pago",
  "whatsapp",
];

const CONCERN_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /piel\s+(seca|grasa|mixta|sensible)|resequ|resec[aou]|deshidrat/, label: "piel" },
  { re: /cabello|cabell[oa]|capilar|pelo|champu|shampoo|frizz|rizo|canas|puntas/, label: "cabello" },
  { re: /maquillaje|makeup|base|rubor|labial|sombras|glow|look/, label: "maquillaje" },
  { re: /tinte|tintes|coloracion|coloración|igora|canas|rubio|casta[nñ]o|decolor|tintur|tenir|teñir|tintarlo/, label: "tintes" },
  { re: /regalo|detalle|combo|kit/, label: "regalo" },
  { re: /u[nñ]as|esmalte|manicure/, label: "uñas" },
  { re: /hombre|barba|afeit/, label: "hombres" },
];

function tokenCount(text: string): number {
  return normalizeAdvisorText(text).split(/\s+/).filter((t) => t.length > 1).length;
}

function hasStrongIntent(text: string): boolean {
  const n = normalizeAdvisorText(text);
  return STRONG_INTENT_MARKERS.some((m) => n.includes(normalizeAdvisorText(m)));
}

function isAffirmation(text: string): boolean {
  const n = normalizeAdvisorText(text);
  return AFFIRMATIONS.some((a) => n === a || n.startsWith(`${a} `));
}

/** Mensaje corto que depende del contexto previo. */
export function isFollowUpMessage(message: string, history: AdvisorHistoryTurn[]): boolean {
  const trimmed = message.trim();
  if (!trimmed || history.length < 2) return false;

  const n = normalizeAdvisorText(trimmed);
  const words = tokenCount(trimmed);

  if (isAffirmation(trimmed)) return true;
  if (words <= 5 && !hasStrongIntent(trimmed)) return true;
  if (words <= 8 && FOLLOW_UP_STARTERS.some((s) => n.startsWith(normalizeAdvisorText(s)))) return true;
  if (/^(el|la|los|las)\s+(primero|primera|segundo|segunda|tercero|tercera)/.test(n)) return true;
  if (/m[aá]s\s+(barato|economico|económico|caro|opciones|alternativas)/.test(n)) return true;
  if (/algo\s+(m[aá]s|mas|menos)/.test(n)) return true;
  if (/que tal si|qué tal si|no se que|no sé que|no se que hacer|no sé qué hacer/.test(n)) return true;
  if (/me lo |me la |me los |me las |con el |con la |pintarlo|tintarlo|tinturarlo/.test(n)) return true;

  return false;
}

/** Une historial + mensaje actual en una sola consulta de búsqueda. */
export function buildAdvisorSearchQueryFromTurns(
  turns: AdvisorHistoryTurn[],
  currentMessage?: string,
): string {
  const parts: string[] = [];

  for (const turn of turns.slice(-ADVISOR_MAX_TURNS)) {
    const text = turn.text.trim();
    if (!text) continue;
    if (turn.role === "user") {
      parts.push(text);
    } else if (text.length <= 220) {
      parts.push(text);
    }
  }

  const current = currentMessage?.trim();
  if (current) {
    const last = parts[parts.length - 1];
    if (last !== current) parts.push(current);
  }

  return parts.join(" ").trim();
}

/** Mensaje efectivo: expande follow-ups con el hilo previo. */
export function resolveEffectiveUserMessage(message: string, history: AdvisorHistoryTurn[]): string {
  const trimmed = message.trim();
  if (!trimmed || history.length < 2) return trimmed;

  let priorTurns = [...history];
  const last = priorTurns[priorTurns.length - 1];
  if (last?.role === "user" && normalizeAdvisorText(last.text) === normalizeAdvisorText(trimmed)) {
    priorTurns = priorTurns.slice(0, -1);
  }

  if (priorTurns.length < 1) return trimmed;
  if (!isFollowUpMessage(trimmed, priorTurns)) return trimmed;

  const threadQuery = buildAdvisorSearchQueryFromTurns(priorTurns);
  if (!threadQuery) return trimmed;

  if (isAffirmation(trimmed)) {
    return threadQuery;
  }

  return `${threadQuery} ${trimmed}`.trim();
}

export function extractAdvisorSessionState(turns: AdvisorHistoryTurn[]): AdvisorSessionState {
  const blob = normalizeAdvisorText(
    turns
      .map((t) => t.text)
      .filter(Boolean)
      .join(" "),
  );

  const concerns: string[] = [];
  for (const { re, label } of CONCERN_PATTERNS) {
    if (re.test(blob) && !concerns.includes(label)) concerns.push(label);
  }

  const maxPriceMatch = blob.match(
    /(?:menos de|hasta|maximo|máximo|bajo|economico|económico|barato)\s*\$?\s*(\d[\d.]*)/,
  );
  let maxPriceCop: number | null = null;
  if (maxPriceMatch) {
    const num = Number(maxPriceMatch[1]!.replace(/\./g, ""));
    if (Number.isFinite(num) && num > 0) maxPriceCop = num;
  }

  let lastProductIds: string[] = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    const ids = turns[i]!.productIds;
    if (ids?.length) {
      lastProductIds = ids;
      break;
    }
  }

  return {
    concerns,
    categorySlugs: [],
    brands: [],
    maxPriceCop,
    lastProductIds,
    turnCount: turns.length,
  };
}

/** Resumen compacto para el LLM (memoria de hilo). */
export function summarizeAdvisorConversation(turns: AdvisorHistoryTurn[], maxChars = 900): string {
  if (turns.length === 0) return "—";

  const state = extractAdvisorSessionState(turns);
  const lines: string[] = [];

  if (state.concerns.length) lines.push(`Intereses: ${state.concerns.join(", ")}`);
  if (state.maxPriceCop) lines.push(`Presupuesto mencionado: hasta $${state.maxPriceCop.toLocaleString("es-CO")} COP`);
  if (state.lastProductIds.length) {
    lines.push(`Últimos productos sugeridos (ids): ${state.lastProductIds.slice(0, 3).join(", ")}`);
  }

  for (const turn of turns.slice(-10)) {
    const prefix = turn.role === "user" ? "Cliente" : "Ginna";
    lines.push(`${prefix}: ${turn.text.trim().slice(0, 180)}`);
  }

  return lines.join("\n").slice(0, maxChars);
}

export function contextualRulesIntro(
  message: string,
  history: AdvisorHistoryTurn[],
  confidence: number,
): string {
  if (history.length < 2) {
    return confidence >= 0.65
      ? "Encontré opciones que encajan con lo que me dices 👇"
      : "Estas opciones del catálogo podrían servirte — revisa y dime si afinamos:";
  }

  if (isFollowUpMessage(message, history)) {
    return "Siguiendo con lo que venimos hablando, estas opciones encajan mejor 👇";
  }

  return confidence >= 0.65
    ? "Tomando en cuenta toda la conversación, te recomiendo esto 👇"
    : "Con el contexto de lo que me contaste, estas opciones podrían servirte:";
}
