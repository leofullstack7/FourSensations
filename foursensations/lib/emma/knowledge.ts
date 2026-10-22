/** Pack de conocimiento Emma versionable (borrador → publicar). */

export type EmmaWashEntry = { key: string; reason: string };

export type EmmaKnowledgeBundle = {
  version: string;
  updatedAt: string;
  note?: string;
  intro: string;
  startButton: string;
  loadingText: string;
  washByP1: Record<"seco" | "graso" | "normal" | "caspa_acumulacion", EmmaWashEntry>;
  scalpAlternativeKey: string;
  scrubGlowKey: string;
  hairMistKeys: string[];
  /** Copy «¿Por qué?» por productKey (override). */
  explanations: Record<string, string>;
  /** Prompts P1–P6 (clave "1"…"6"). */
  questionPrompts: Record<string, string>;
  reactions: {
    p1: Record<string, string>;
    p5: Record<string, string>;
    p2: string;
    p3: string;
    p4None: string;
    p4Some: string;
    p6None: string;
    p6Some: string;
  };
  /**
   * Mapa editable P5 → productos protagonistas (orden).
   * Desempates finos de reparación siguen en el motor.
   */
  p5Products: Record<string, string[]>;
};

export type EmmaKnowledgeHistoryItem = {
  at: string;
  note: string;
  version: string;
  bundle: EmmaKnowledgeBundle;
};

export type EmmaKnowledgeState = {
  draft: EmmaKnowledgeBundle;
  published: EmmaKnowledgeBundle | null;
  history: EmmaKnowledgeHistoryItem[];
};

function nowIso() {
  return new Date().toISOString();
}

export function defaultEmmaKnowledge(note = "Pack base Excel FINAL_P1"): EmmaKnowledgeBundle {
  return {
    version: "1.0.0",
    updatedAt: nowIso(),
    note,
    intro:
      "Hola, soy Emma 💗 Antes de recomendarte una rutina, quiero conocer un poquito de tu cabello. Son unas preguntitas súper fáciles y al final te muestro qué productos Four Sensations elegiría para ti. ¿Empezamos?",
    startButton: "Sí, conozcamos mi cabello 💗",
    loadingText: "¡Listoooo! 💗 Voy a unir todo lo que me contaste para elegir tu rutina.",
    washByP1: {
      seco: {
        key: "Kit Tentación Nutrición",
        reason: "Como me contaste que sientes tu cabello seco, esta es mi primera elección para tu lavado.",
      },
      graso: {
        key: "Kit Tentación Equilibrio",
        reason: "Como me contaste que tu cabello es graso, mi primera elección es Tentación Equilibrio.",
      },
      normal: {
        key: "Botanical",
        reason: "Como me contaste que tu cabello es normal, Botanical es mi recomendación de shampoo.",
      },
      caspa_acumulacion: {
        key: "Kit Scalp Therapy",
        reason: "Como mencionaste caspa o acumulación, Scalp Therapy es mi base de lavado para tu cuero cabelludo.",
      },
    },
    scalpAlternativeKey: "Kit Scalp Therapy",
    scrubGlowKey: "Scrub Glow",
    hairMistKeys: ["BloomShine", "Sweet Love", "Scarlette", "Golden Glow"],
    explanations: {
      Botanical: "Lo elegí como base de limpieza porque me contaste que tu cabello es normal.",
      "Kit Tentación Nutrición":
        "Como sientes tu cabello seco, elegí Tentación Nutrición como base de tu rutina.",
      "Kit Tentación Equilibrio":
        "Como me dijiste que tu cabello es graso, elegí Tentación Equilibrio como base de limpieza inteligente.",
      "Kit Scalp Therapy":
        "Elegí Scalp Therapy porque marcaste necesidades de limpieza específica en el cuero cabelludo.",
      "Scrub Glow":
        "Como marcaste acumulación o descamación, añadí Scrub Glow como paso exfoliante de cuero cabelludo.",
      "Secreto de Primavera":
        "Lo elegí porque me contaste que quieres cuidar la caída o favorecer el crecimiento.",
      "Shots Capilares": "Los elegí como complemento del tónico por tu prioridad de cuidado capilar.",
      "Dulce Renacer":
        "Como marcaste resequedad y/o necesidad de nutrición, elegí Dulce Renacer para cuidar los largos.",
      "Sensación Primaveral":
        "Como marcaste daño, quiebre o enredos, elegí el repolarizador para acondicionar los largos.",
      "Proteína Capilar": "Lo elegí para complementar el cuidado de la fibra según las señales que marcaste.",
      "Luna Llena":
        "Como me contaste que tienes las puntas maltratadas, elegí Luna Llena para tu rutina SOS de puntas.",
      Suspiros: "Lo añadí como complemento de tu rutina de puntas.",
      "Fantasía Natural": "Como expones tu cabello al calor u otras agresiones, añadí protección capilar a tu rutina.",
      "Shine Gloss": "Como quieres más brillo y/o controlar el frizz, elegí Shine Gloss para el acabado.",
      BloomShine: "Y para cerrar con un aroma delicioso, puedes elegir tu Hair Mist favorito. 💗",
    },
    questionPrompts: {
      "1": "Empecemos por lo básico 👀 ¿Cuál de estas opciones describe mejor tu cabello o cuero cabelludo?",
      "2": "Ahora cuéntame un poquito de tu historia 💗 ¿Tu cabello tiene actualmente alguno de estos procesos?",
      "3": "Ahora sí, cuéntame qué estás sintiendo en tu cabello. Puedes marcar todo lo que aplique 💗",
      "4": "Ahora vamos a la raíz 👀 ¿Notas alguna de estas situaciones en tu cuero cabelludo?",
      "5": "Ya te voy conociendo 💕 Si pudieras mejorar UNA sola cosa de tu cabello primero, ¿cuál sería?",
      "6": "¡Última, prometido! ✨ ¿A cuáles de estas cosas expones tu cabello con frecuencia?",
    },
    reactions: {
      p1: {
        seco: "Perfecto 💗 Ya tengo una primera pista. Ahora quiero conocer la historia de tu cabello.",
        graso: "Anotado 💗 Ahora cuéntame un poquito de su historia.",
        normal: "Súper 💗 Ahora conozcamos un poquito de su historia.",
        caspa_acumulacion:
          "Perfecto 💗 Anoté esa necesidad de cuero cabelludo. Ahora cuéntame un poquito de la historia de tu cabello.",
      },
      p5: {
        reparar: "Perfecto 💗 Reparación queda como tu prioridad #1. Me falta una última cosita para terminar de conocerte.",
        nutrir: "Anotadísimo 💗 Nutrición e hidratación quedan como tu prioridad #1. Me falta una última cosita.",
        grasa: "Perfecto ✨ Ya sé que controlar la grasa es lo primero que quieres trabajar. Solo me falta una última pregunta.",
        caspa: "Entendido 💗 El cuidado de la caspa y la descamación queda como tu prioridad. Ya casi terminamos.",
        caida: "Okeyyy 💗 Fortalecimiento y cuidado de la caída quedan como prioridad #1. Me falta una última cosita.",
        crecimiento: "Perfecto 💗 Meta clarísima: favorecer el crecimiento. Ya casi tengo todo para armar tu rutina.",
        frizz: "Anotadísimo ✨ Controlar el frizz queda como tu prioridad. Una última pregunta y Emma hace lo suyo 💗",
        brillo: "Amooo ✨ Más brillo queda como tu prioridad #1. Me falta una última cosita para terminar.",
        puntas: "Perfecto 💗 Esas puntas quedan oficialmente como prioridad. Una última pregunta y terminamos.",
      },
      p2: "Perfecto 💗 Ya tengo esa parte de la historia de tu cabello. Ahora cuéntame cómo lo sientes.",
      p3: "Perfecto 💗 Guardé todo lo que marcaste. Ahora vamos a mirar la raíz.",
      p4None: "Perfecto 💗 Por ahora no identificas ninguna de esas situaciones en tu cuero cabelludo.",
      p4Some: "Perfecto 💗 Ya entendí mejor tu cuero cabelludo. Ahora dime qué te gustaría mejorar primero.",
      p6None: "¡Listoooo! 💗 Con lo que me contaste ya puedo armar tu rutina.",
      p6Some: "¡Listoooo! 💗 Ya tengo todo para armar tu rutina Four Sensations.",
    },
    p5Products: {
      nutrir: ["Dulce Renacer"],
      grasa: [],
      caspa: [],
      caida: ["Secreto de Primavera", "Shots Capilares"],
      crecimiento: ["Secreto de Primavera", "Shots Capilares"],
      frizz: ["Shine Gloss"],
      brillo: ["Shine Gloss"],
      puntas: ["Luna Llena", "Suspiros"],
      // reparar se resuelve con desempates P3 en el motor
      reparar: [],
    },
  };
}

export function normalizeEmmaKnowledgeBundle(raw: unknown): EmmaKnowledgeBundle {
  const base = defaultEmmaKnowledge();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<EmmaKnowledgeBundle>;
  const wash = { ...base.washByP1, ...(r.washByP1 ?? {}) };
  for (const k of ["seco", "graso", "normal", "caspa_acumulacion"] as const) {
    const entry = wash[k];
    if (!entry?.key?.trim()) wash[k] = base.washByP1[k];
    else wash[k] = { key: String(entry.key).trim(), reason: String(entry.reason ?? "").trim() || base.washByP1[k].reason };
  }
  return {
    ...base,
    ...r,
    version: String(r.version ?? base.version).trim() || base.version,
    updatedAt: String(r.updatedAt ?? nowIso()),
    note: r.note != null ? String(r.note) : base.note,
    intro: String(r.intro ?? base.intro),
    startButton: String(r.startButton ?? base.startButton),
    loadingText: String(r.loadingText ?? base.loadingText),
    washByP1: wash,
    scalpAlternativeKey: String(r.scalpAlternativeKey ?? base.scalpAlternativeKey).trim() || base.scalpAlternativeKey,
    scrubGlowKey: String(r.scrubGlowKey ?? base.scrubGlowKey).trim() || base.scrubGlowKey,
    hairMistKeys: Array.isArray(r.hairMistKeys) && r.hairMistKeys.length
      ? r.hairMistKeys.map((x) => String(x).trim()).filter(Boolean)
      : base.hairMistKeys,
    explanations: { ...base.explanations, ...(r.explanations ?? {}) },
    questionPrompts: { ...base.questionPrompts, ...(r.questionPrompts ?? {}) },
    reactions: {
      ...base.reactions,
      ...(r.reactions ?? {}),
      p1: { ...base.reactions.p1, ...(r.reactions?.p1 ?? {}) },
      p5: { ...base.reactions.p5, ...(r.reactions?.p5 ?? {}) },
    },
    p5Products: { ...base.p5Products, ...(r.p5Products ?? {}) },
  };
}

export function normalizeEmmaKnowledgeState(raw: unknown): EmmaKnowledgeState {
  const defaults = defaultEmmaKnowledge();
  if (!raw || typeof raw !== "object") {
    return { draft: defaults, published: null, history: [] };
  }
  const r = raw as Partial<EmmaKnowledgeState>;
  const history = Array.isArray(r.history)
    ? r.history
        .filter((h) => h && typeof h === "object")
        .map((h) => ({
          at: String((h as EmmaKnowledgeHistoryItem).at || nowIso()),
          note: String((h as EmmaKnowledgeHistoryItem).note || ""),
          version: String((h as EmmaKnowledgeHistoryItem).version || ""),
          bundle: normalizeEmmaKnowledgeBundle((h as EmmaKnowledgeHistoryItem).bundle),
        }))
        .slice(0, 30)
    : [];
  return {
    draft: normalizeEmmaKnowledgeBundle(r.draft ?? defaults),
    published: r.published ? normalizeEmmaKnowledgeBundle(r.published) : null,
    history,
  };
}

export function bumpVersion(current: string): string {
  const m = current.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return "1.0.1";
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}
