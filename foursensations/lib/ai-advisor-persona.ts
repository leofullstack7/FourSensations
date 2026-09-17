import { WHATSAPP_BUSINESS_DISPLAY } from "@/lib/storefront-contact";
import type { AdvisorHistoryTurn, AiAdvisorReply } from "@/lib/ai-advisor";
import { extractAdvisorSessionState } from "@/lib/ai-advisor-context";
import { JULI_CATALOG_RULES } from "@/lib/juli-knowledge";

export const FS_ADVISOR_INTENTIONS = [
  "Escuchar con cercanía qué le pasa al cabello o a la rutina de la clienta.",
  "Recomendar SOLO productos Four Sensations de la tienda, según la ficha oficial del catálogo.",
  "Invitar a agregar al carrito o guardar en favoritos.",
  "Hablar como Juli: cálida, clara y experta — nunca robótica ni genérica.",
  `Si la pregunta no es de belleza/tienda: redirigir con amabilidad y ofrecer WhatsApp ${WHATSAPP_BUSINESS_DISPLAY}.`,
] as const;

/** @deprecated Usar FS_ADVISOR_INTENTIONS */
export const GINNA_ADVISOR_INTENTIONS = FS_ADVISOR_INTENTIONS;

export const FS_ADVISOR_PERSONA = `Eres Juli, la asesora IA de Four Sensations (Colombia, Manizales).
Hablas en primera persona, cercana y segura: «soy Juli».
${JULI_CATALOG_RULES}
Tono: dulce, moderna, experta. 1 a 3 frases. Español de Colombia.
No prometas milagros médicos. WhatsApp: ${WHATSAPP_BUSINESS_DISPLAY}.`;

/** @deprecated Usar FS_ADVISOR_PERSONA */
export const GINNA_ADVISOR_PERSONA = FS_ADVISOR_PERSONA;

export const FS_WELCOME_MESSAGE =
  "Hola, soy Juli 💜 Tu aliada capilar en Four Sensations. Dime qué sientes en tu cabello — sequedad, frizz, caída, cuero cabelludo… — y te armo una recomendación con productos de la casa.";

/** @deprecated Usar FS_WELCOME_MESSAGE */
export const GINNA_WELCOME_MESSAGE = FS_WELCOME_MESSAGE;

export const FS_PRODUCT_FOLLOWUP =
  "Si alguno te enamora, agrégalo al carrito 🛒 o guárdalo en favoritos ♡. ¿Afinamos un paso más de tu rutina?";

/** @deprecated Usar FS_PRODUCT_FOLLOWUP */
export const GINNA_PRODUCT_FOLLOWUP = FS_PRODUCT_FOLLOWUP;

const OFF_TOPIC_PHRASES = [
  "presidente",
  "futbol",
  "fútbol",
  "bitcoin",
  "noticias del dia",
  "resultado del partido",
  "clima",
  "tiempo hoy",
  "receta de",
  "cocinar",
  "tarea escolar",
  "programacion",
  "programación",
  "python",
  "javascript",
  "iphone",
  "android",
  "pelicula",
  "película",
  "serie de netflix",
  "netflix",
  "medicina",
  "doctor",
  "enfermedad",
  "politica",
  "política",
  "economia",
  "economía",
  "dolar",
  "dólar",
  "chatgpt",
  "inteligencia artificial general",
  "quien gano",
  "quién ganó",
  "mundial",
  "elecciones",
];

const BEAUTY_SCOPE_MARKERS = [
  "piel",
  "cabello",
  "capilar",
  "pelo",
  "maquillaje",
  "makeup",
  "tinte",
  "tintes",
  "tintur",
  "teñir",
  "tenir",
  "coloracion",
  "canas",
  "labial",
  "base",
  "serum",
  "crema",
  "shampoo",
  "champu",
  "acne",
  "frizz",
  "rizo",
  "uña",
  "esmalte",
  "regalo",
  "belleza",
  "hidrat",
  "repar",
  "rutina",
  "facial",
  "barba",
  "cuidado",
  "envio",
  "envío",
  "pago",
  "carrito",
  "producto",
  "catalogo",
  "catálogo",
  "four sensations",
  "juli",
  "comprar",
  "precio",
  "danad",
  "maltrat",
  "tratam",
  "mascarilla",
  "acondicion",
  "recomiend",
  "caida",
  "caspa",
  "cuero",
  "proteina",
  "brillo",
  "puntas",
];

export function isConversationInBeautyScope(history: AdvisorHistoryTurn[]): boolean {
  if (history.length < 2) return false;
  const state = extractAdvisorSessionState(history);
  if (state.concerns.length > 0) return true;
  if (state.lastProductIds.length > 0) return true;
  const blob = history.map((t) => t.text).join(" ");
  return hasBeautyScope(blob);
}

export function isLikelyOffTopicMessage(text: string, history: AdvisorHistoryTurn[] = []): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (hasBeautyScope(trimmed)) return false;
  if (isConversationInBeautyScope(history)) return false;
  if (OFF_TOPIC_PHRASES.some((p) => includesPhrase(trimmed, p))) return true;
  if (history.length === 0 && trimmed.includes("?") && trimmed.length > 25) return true;
  return false;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function includesPhrase(text: string, phrase: string): boolean {
  return normalize(text).includes(normalize(phrase));
}

function hasBeautyScope(text: string): boolean {
  const n = normalize(text);
  return BEAUTY_SCOPE_MARKERS.some((m) => n.includes(normalize(m)));
}

function messageMentionsTinting(text: string): boolean {
  const n = normalize(text);
  return /tintur|tenir|teñir|coloracion|colorar|pintar el pelo|pintarlo/.test(n);
}

const CONCERN_EMPATHY: Record<string, string> = {
  piel: "Te escucho. Para piel, te dejo opciones de la tienda que encajan con lo que me cuentas:",
  cabello: "Entiendo lo de tu cabello. Con el catálogo Four Sensations te armo esto:",
  maquillaje: "Para el look que buscas, estas piezas de la tienda son un buen punto de partida:",
  tintes: "Si quieres color, te oriento con lo que tenemos en Four Sensations:",
  regalo: "Un detalle capilar siempre enamora. Mira estas ideas de la casa:",
  uñas: "Para uñas, estas opciones de la tienda van muy bien:",
  hombres: "También hay cuidado pensado para ellos. Te dejo estas recomendaciones:",
};

export function empatheticProductIntro(
  history: AdvisorHistoryTurn[],
  isFollowUp: boolean,
  currentMessage = "",
): string {
  const state = extractAdvisorSessionState(history);
  const mentionsTint = messageMentionsTinting(currentMessage);

  if (isFollowUp && state.concerns.includes("cabello") && mentionsTint) {
    return "Tinturar cabello dañado se puede, con cuidado. Te sugiero opciones de la tienda que protegen mientras reparas 👇";
  }

  if (isFollowUp && mentionsTint) {
    return "Buena idea explorar color. Te dejo lo que tenemos en Four Sensations para distintos tonos 👇";
  }

  if (isFollowUp) {
    return "Siguiendo lo que me contaste, esto encaja mejor 👇";
  }

  for (const c of state.concerns) {
    const line = CONCERN_EMPATHY[c];
    if (line) return line;
  }

  return "Con lo que me cuentas, estos productos Four Sensations te van a servir 👇";
}

export function buildOffTopicAdvisorReply(): AiAdvisorReply {
  return {
    confidence: 0,
    engine: "rules",
    messages: [
      {
        role: "bot",
        text: "Eso se sale un poquito de mi mundo 😊 Soy Juli, tu aliada capilar en Four Sensations. Cuéntame de tu cabello — o mira el catálogo — y te ayudo con productos de la casa.",
        actions: [
          { label: "Ver productos de la tienda", kind: "catalog" },
          { label: "Escríbenos por WhatsApp", kind: "whatsapp" },
        ],
      },
    ],
  };
}

export function appendProductFollowUp(messages: AiAdvisorReply["messages"]): AiAdvisorReply["messages"] {
  const last = messages[messages.length - 1];
  if (!last?.productIds?.length) return messages;
  return [...messages, { role: "bot" as const, text: FS_PRODUCT_FOLLOWUP }];
}
