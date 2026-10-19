export const FULFILLMENT_STAGES = [
  {
    id: 1,
    title: "¡Pedido confirmado! 💌",
    body: "Girl, ¡tus nuevos favoritos ya son oficialmente tuyos! Recibimos tu pedido con mucho amor.",
  },
  {
    id: 2,
    title: "¡Alistando tus nuevas obsesiones! 🎀",
    body: "Estamos alistando cada uno de tus must-haves para que lleguen perfectos a tus manos.",
  },
  {
    id: 3,
    title: "¡Tus favoritos van en camino! 💗",
    body: "Tu pedido ya salió de nuestro Club y comenzó su viaje hasta ti. ¡Qué emoción!",
  },
  {
    id: 4,
    title: "¡Hoy es el día, girl! ✨",
    body: "Tus must-haves están en reparto. ¡Prepárate para recibir tu dosis de Four Sensations!",
  },
  {
    id: 5,
    title: "¡Oficialmente en tus manos! 💕",
    body: "Tu pedido fue entregado. ¡Ahora sí, que comience LA MAGIA!",
  },
] as const;

export type FulfillmentStageId = (typeof FULFILLMENT_STAGES)[number]["id"];

export function clampFulfillmentStage(raw: unknown): FulfillmentStageId {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n >= 1 && n <= 5) return n as FulfillmentStageId;
  return 1;
}

/** Fecha calendario YYYY-MM-DD en zona America/Bogota. */
export function bogotaDateKey(input: Date | string | number = new Date()): string {
  const d = input instanceof Date ? input : new Date(input);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Hora 0–23 en America/Bogota. */
export function bogotaHour(input: Date | string | number = new Date()): number {
  const d = input instanceof Date ? input : new Date(input);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  return Number.isFinite(hour) ? hour : 0;
}

/** Fase 2 + después de las 15:00 Colombia → tarjeta roja (no sale hoy). */
export function isFulfillmentStageLate(stage: number, now = new Date()): boolean {
  return stage === 2 && bogotaHour(now) >= 15;
}

export function todayBogotaKey(): string {
  return bogotaDateKey(new Date());
}
