import { WHATSAPP_BUSINESS_DISPLAY } from "@/lib/storefront-contact";
import type { AdvisorHistoryTurn, AiAdvisorReply } from "@/lib/ai-advisor";
import { extractAdvisorSessionState } from "@/lib/ai-advisor-context";

/** Intenciones principales de Ginna AI en tienda. */
export const GINNA_ADVISOR_INTENTIONS = [
  "Escuchar la preocupación de imagen o cuidado personal del cliente (piel, cabello, maquillaje, tintes, uñas).",
  "Recomendar productos reales de GinnaBeauty que ayuden con ese problema.",
  "Invitar a agregar al carrito o guardar en favoritos para comprar después.",
  "Mantener conversación cálida, como asesora humana de la tienda — nunca robótica.",
  `Si la pregunta no es de belleza/tienda: redirigir con amabilidad a explorar el catálogo, recordar calidad profesional y ofrecer WhatsApp ${WHATSAPP_BUSINESS_DISPLAY}.`,
] as const;

export const GINNA_ADVISOR_PERSONA = `Eres Ginna AI, asesora de GinnaBeauty en Colombia.
Hablas como una empleada experta, cercana y profesional de la tienda — tú SÍ trabajas aquí.
Tu prioridad es entender la preocupación de belleza o imagen del cliente y recomendar productos del catálogo.
Siempre invita a agregar al carrito o guardar en favoritos cuando recomiendes productos.
En GinnaBeauty trabajamos marcas de calidad profesional; transmite confianza sin exagerar.
Si preguntan algo fuera de belleza o la tienda, redirige con amabilidad al catálogo y ofrece WhatsApp ${WHATSAPP_BUSINESS_DISPLAY}.
WhatsApp de atención GinnaBeauty: ${WHATSAPP_BUSINESS_DISPLAY}.`;

export const GINNA_WELCOME_MESSAGE =
  "Hola, soy Ginna AI ✨ Asesora de GinnaBeauty. Cuéntame qué te preocupa — piel, cabello, maquillaje, tintes… — y te recomiendo productos de calidad para que los lleves al carrito o los guardes en favoritos.";

export const GINNA_PRODUCT_FOLLOWUP =
  "Si alguno te convence, agrégalo al carrito 🛒 o guárdalo en favoritos ♡. ¿Quieres que afinemos más la recomendación?";

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
  "tinturo",
  "tintura",
  "tinturas",
  "teñir",
  "tenir",
  "coloracion",
  "coloración",
  "pintar",
  "canas",
  "rubio",
  "casta",
  "labial",
  "base",
  "serum",
  "crema",
  "shampoo",
  "champu",
  "acne",
  "grano",
  "mancha",
  "frizz",
  "rizo",
  "uña",
  "una",
  "esmalte",
  "regalo",
  "belleza",
  "cosmet",
  "hidrat",
  "repar",
  "igora",
  "rutina",
  "facial",
  "barba",
  "look",
  "glow",
  "aspecto",
  "imagen",
  "cuidado",
  "envio",
  "envío",
  "pago",
  "carrito",
  "producto",
  "catalogo",
  "catálogo",
  "ginna",
  "comprar",
  "precio",
  "danad",
  "maltrat",
  "tratam",
  "mascarilla",
  "acondicion",
  "recomiend",
  "afin",
];

/** ¿El hilo ya es claramente de belleza / tienda? */
export function isConversationInBeautyScope(history: AdvisorHistoryTurn[]): boolean {
  if (history.length < 2) return false;
  const state = extractAdvisorSessionState(history);
  if (state.concerns.length > 0) return true;
  if (state.lastProductIds.length > 0) return true;
  const blob = history.map((t) => t.text).join(" ");
  return hasBeautyScope(blob);
}

/** Pregunta probablemente fuera de belleza / tienda. Nunca en medio de un hilo de belleza. */
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
  piel: "Entiendo lo de tu piel — en GinnaBeauty tenemos productos profesionales que suelen ayudar mucho. Te recomiendo estos:",
  cabello: "Sé lo importante que es sentir el cabello sano — mira estas opciones de nuestro catálogo:",
  maquillaje: "Para lograr el look que buscas, estas piezas de GinnaBeauty son un buen punto de partida:",
  tintes: "Cubrir canas o cambiar de tono con calidad profesional es posible — te sugiero estos tintes:",
  regalo: "Un detalle de belleza siempre encanta — estas ideas del catálogo son especiales:",
  uñas: "Para unas impecables, estas opciones de la tienda van muy bien:",
  hombres: "Tenemos línea pensada para el cuidado masculino — mira estas recomendaciones:",
};

export function empatheticProductIntro(
  history: AdvisorHistoryTurn[],
  isFollowUp: boolean,
  currentMessage = "",
): string {
  const state = extractAdvisorSessionState(history);
  const mentionsTint = messageMentionsTinting(currentMessage);

  if (isFollowUp && state.concerns.includes("cabello") && mentionsTint) {
    return "Tinturar cabello dañado se puede, pero conviene hacerlo con cuidado — te sugiero tintes profesionales y opciones que protegen mientras reparas 👇";
  }

  if (isFollowUp && mentionsTint) {
    return "Buena idea explorar un tinte — en GinnaBeauty tenemos líneas profesionales para distintos tonos y necesidades 👇";
  }

  if (isFollowUp) {
    return "Siguiendo con lo que venimos hablando, estas opciones encajan mejor con lo que buscas 👇";
  }

  for (const c of state.concerns) {
    const line = CONCERN_EMPATHY[c];
    if (line) return line;
  }

  return "Para lo que me cuentas, estos productos de GinnaBeauty pueden ayudarte mucho 👇";
}

export function buildOffTopicAdvisorReply(): AiAdvisorReply {
  return {
    confidence: 0,
    engine: "rules",
    messages: [
      {
        role: "bot",
        text: "Eso se sale un poco de mi área 😊 Soy asesora de GinnaBeauty y estoy para ayudarte con tu cuidado personal: piel, cabello, maquillaje, tintes y más. Trabajamos con marcas de calidad profesional — te invito a explorar la tienda y encontrar algo que te encante.",
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
  return [...messages, { role: "bot" as const, text: GINNA_PRODUCT_FOLLOWUP }];
}
