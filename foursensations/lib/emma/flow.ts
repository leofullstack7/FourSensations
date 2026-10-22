/** Flujo + motor Emma (Matriz + Motor FINAL_P1 · oct 2026). */

export type EmmaSelectionMode = "single" | "multi";

export type EmmaOption = {
  id: string;
  label: string;
  hint?: string;
};

export type EmmaQuestion = {
  id: number;
  prompt: string;
  mode: EmmaSelectionMode;
  options: EmmaOption[];
};

export const EMMA_INTRO =
  "Hola, soy Emma 💗 Antes de recomendarte una rutina, quiero conocer un poquito de tu cabello. Son unas preguntitas súper fáciles y al final te muestro qué productos Four Sensations elegiría para ti. ¿Empezamos?";

export const EMMA_START_BUTTON = "Sí, conozcamos mi cabello 💗";

export const EMMA_LEFT_COPY = {
  greeting: "Hola, soy Emma 💗 Tu aliada capilar Four Sensations.",
  body: "¿Frizz, resequedad, caída, grasa, caspa o daño? Cuéntame qué necesita tu cabello y juntas encontraremos la rutina y los productos Four Sensations que mejor se adapten a ti 👩🏻‍🦰🌸",
  hearts: ["TE ESCUCHO", "TE GUÍO", "TE RECOMIENDO"] as const,
};

export const EMMA_QUESTIONS: EmmaQuestion[] = [
  {
    id: 1,
    prompt: "Empecemos por lo básico 👀 ¿Cuál de estas opciones describe mejor tu cabello o cuero cabelludo?",
    mode: "single",
    options: [
      { id: "seco", label: "Seco" },
      { id: "graso", label: "Graso" },
      { id: "normal", label: "Normal" },
      { id: "caspa_acumulacion", label: "Con caspa o acumulación" },
    ],
  },
  {
    id: 2,
    prompt: "Ahora cuéntame un poquito de tu historia 💗 ¿Tu cabello tiene actualmente alguno de estos procesos?",
    mode: "multi",
    options: [
      { id: "natural", label: "Natural / sin procesos" },
      { id: "tinte", label: "Tinte" },
      { id: "decoloracion", label: "Decoloración o balayage" },
      { id: "alisado", label: "Keratina o alisado" },
    ],
  },
  {
    id: 3,
    prompt: "Ahora sí, cuéntame qué estás sintiendo en tu cabello. Puedes marcar todo lo que aplique 💗",
    mode: "multi",
    options: [
      { id: "resequedad", label: "Resequedad" },
      { id: "frizz", label: "Frizz" },
      { id: "opacidad", label: "Opacidad y poco brillo" },
      { id: "dano", label: "Daño y porosidad" },
      { id: "quiebre", label: "Quiebre y debilidad" },
      { id: "puntas", label: "Puntas maltratadas" },
      { id: "enreda", label: "Se enreda fácilmente" },
    ],
  },
  {
    id: 4,
    prompt: "Ahora vamos a la raíz 👀 ¿Notas alguna de estas situaciones en tu cuero cabelludo?",
    mode: "multi",
    options: [
      { id: "grasa", label: "Exceso de grasa" },
      { id: "caspa", label: "Caspa" },
      { id: "descamacion", label: "Descamación" },
      { id: "acumulacion", label: "Acumulación o pesadez" },
      { id: "caida", label: "Caída" },
      { id: "crecimiento", label: "Crecimiento lento" },
      { id: "ninguno", label: "Ninguno" },
    ],
  },
  {
    id: 5,
    prompt: "Ya te voy conociendo 💕 Si pudieras mejorar UNA sola cosa de tu cabello primero, ¿cuál sería?",
    mode: "single",
    options: [
      { id: "reparar", label: "Repararlo" },
      { id: "nutrir", label: "Nutrirlo o hidratarlo" },
      { id: "grasa", label: "Controlar grasa" },
      { id: "caspa", label: "Cuidar caspa o descamación" },
      { id: "caida", label: "Fortalecer y cuidar la caída" },
      { id: "crecimiento", label: "Favorecer el crecimiento" },
      { id: "frizz", label: "Controlar el frizz" },
      { id: "brillo", label: "Tener más brillo" },
      { id: "puntas", label: "Reparar mis puntas" },
    ],
  },
  {
    id: 6,
    prompt: "¡Última, prometido! ✨ ¿A cuáles de estas cosas expones tu cabello con frecuencia?",
    mode: "multi",
    options: [
      { id: "calor", label: "Calor frecuente (plancha, secador o rizador)" },
      { id: "sol", label: "Sol / exposición UV" },
      { id: "humedad", label: "Humedad ambiental" },
      { id: "piscina_mar", label: "Piscina o mar" },
      { id: "ninguna", label: "Ninguna de las anteriores" },
    ],
  },
];

const Q1_REACT: Record<string, string> = {
  seco: "Perfecto 💗 Ya tengo una primera pista. Ahora quiero conocer la historia de tu cabello.",
  graso: "Anotado 💗 Ahora cuéntame un poquito de su historia.",
  normal: "Súper 💗 Ahora conozcamos un poquito de su historia.",
  caspa_acumulacion: "Perfecto 💗 Anoté esa necesidad de cuero cabelludo. Ahora cuéntame un poquito de la historia de tu cabello.",
};

const Q5_REACT: Record<string, string> = {
  reparar: "Perfecto 💗 Reparación queda como tu prioridad #1. Me falta una última cosita para terminar de conocerte.",
  nutrir: "Anotadísimo 💗 Nutrición e hidratación quedan como tu prioridad #1. Me falta una última cosita.",
  grasa: "Perfecto ✨ Ya sé que controlar la grasa es lo primero que quieres trabajar. Solo me falta una última pregunta.",
  caspa: "Entendido 💗 El cuidado de la caspa y la descamación queda como tu prioridad. Ya casi terminamos.",
  caida: "Okeyyy 💗 Fortalecimiento y cuidado de la caída quedan como prioridad #1. Me falta una última cosita.",
  crecimiento: "Perfecto 💗 Meta clarísima: favorecer el crecimiento. Ya casi tengo todo para armar tu rutina.",
  frizz: "Anotadísimo ✨ Controlar el frizz queda como tu prioridad. Una última pregunta y Emma hace lo suyo 💗",
  brillo: "Amooo ✨ Más brillo queda como tu prioridad #1. Me falta una última cosita para terminar.",
  puntas: "Perfecto 💗 Esas puntas quedan oficialmente como prioridad. Una última pregunta y terminamos.",
};

export function emmaReactionForAnswer(questionId: number, selectedIds: string[]): string {
  if (questionId === 1) {
    return Q1_REACT[selectedIds[0] ?? ""] ?? "Perfecto 💗 Sigamos.";
  }
  if (questionId === 2) {
    if (selectedIds.includes("natural") && selectedIds.length === 1) {
      return "Perfecto 💗 Ya tengo esa parte de la historia de tu cabello. Ahora cuéntame cómo lo sientes.";
    }
    if (selectedIds.length > 1) {
      return "Perfecto 💗 Ya tengo esa parte de la historia de tu cabello. Ahora cuéntame cómo lo sientes.";
    }
    return "Perfecto 💗 Ya tengo esa parte de la historia de tu cabello. Ahora cuéntame cómo lo sientes.";
  }
  if (questionId === 3) {
    return "Perfecto 💗 Guardé todo lo que marcaste. Ahora vamos a mirar la raíz.";
  }
  if (questionId === 4) {
    if (selectedIds.includes("ninguno") && selectedIds.length === 1) {
      return "Perfecto 💗 Por ahora no identificas ninguna de esas situaciones en tu cuero cabelludo.";
    }
    return "Perfecto 💗 Ya entendí mejor tu cuero cabelludo. Ahora dime qué te gustaría mejorar primero.";
  }
  if (questionId === 5) {
    return Q5_REACT[selectedIds[0] ?? ""] ?? "Perfecto 💗 Esa será nuestra prioridad. Me falta una última cosita.";
  }
  if (questionId === 6) {
    if (selectedIds.includes("ninguna") && selectedIds.length === 1) {
      return "¡Listoooo! 💗 Con lo que me contaste ya puedo armar tu rutina.";
    }
    return "¡Listoooo! 💗 Ya tengo todo para armar tu rutina Four Sensations.";
  }
  return "Perfecto 💗";
}

/** Normaliza selección excluyente (Natural / Ninguno / Ninguna). */
export function normalizeExclusiveSelection(questionId: number, selectedIds: string[]): string[] {
  if (questionId === 2 && selectedIds.includes("natural")) return ["natural"];
  if (questionId === 4 && selectedIds.includes("ninguno")) return ["ninguno"];
  if (questionId === 6 && selectedIds.includes("ninguna")) return ["ninguna"];
  return selectedIds;
}

export type EmmaAnswers = {
  hairType: string;
  processes: string[];
  feelings: string[];
  scalp: string[];
  priority: string;
  exposure: string[];
};

export type EmmaRoutineItem = {
  productKey: string;
  reason: string;
  step: string;
  evidence?: string;
  optional?: boolean;
};

export type EmmaRecommendation = {
  primary: EmmaRoutineItem[];
  extras: EmmaRoutineItem[];
  summary: string;
  baseWash: EmmaRoutineItem;
  alternativeWash: EmmaRoutineItem | null;
  /** Clave de lavado seleccionada por defecto (base P1). */
  defaultWashKey: string;
};

const WASH_BY_P1: Record<string, { key: string; reason: string }> = {
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
};

function hasAny(ids: string[], set: string[]) {
  return set.some((x) => ids.includes(x));
}

function needsScalpAlternative(answers: EmmaAnswers, baseKey: string): boolean {
  if (baseKey === "Kit Scalp Therapy") return false;
  const scalpTrigger = hasAny(answers.scalp, ["grasa", "caspa", "descamacion", "acumulacion"]);
  const priorityTrigger = answers.priority === "grasa" || answers.priority === "caspa";
  return scalpTrigger || priorityTrigger;
}

function needsScrubGlow(answers: EmmaAnswers): boolean {
  return (
    hasAny(answers.scalp, ["caspa", "descamacion", "acumulacion"]) || answers.priority === "caspa"
  );
}

function pushUnique(list: EmmaRoutineItem[], item: EmmaRoutineItem) {
  if (list.some((x) => x.productKey === item.productKey)) return;
  list.push(item);
}

/** Protagonistas P5 + desempates P3 (hoja Desempates). */
function protagonistsFromP5(answers: EmmaAnswers): EmmaRoutineItem[] {
  const out: EmmaRoutineItem[] = [];
  const f = answers.feelings;
  switch (answers.priority) {
    case "reparar":
      if (f.includes("puntas")) {
        pushUnique(out, {
          productKey: "Luna Llena",
          step: "Prioridad",
          reason: "Tu prioridad es reparar y marcaste puntas maltratadas.",
          evidence: "P5+P3",
        });
        pushUnique(out, {
          productKey: "Suspiros",
          step: "Prioridad",
          reason: "Dupla de puntas junto a Luna Llena.",
          evidence: "P5+P3",
        });
      } else if (hasAny(f, ["dano", "quiebre"])) {
        pushUnique(out, {
          productKey: "Sensación Primaveral",
          step: "Prioridad",
          reason: "Prioridad reparación con daño/porosidad o quiebre: Repolarizador.",
          evidence: "P5+P3",
        });
      } else if (f.includes("resequedad")) {
        pushUnique(out, {
          productKey: "Dulce Renacer",
          step: "Prioridad",
          reason: "Prioridad reparación con resequedad predominante.",
          evidence: "P5+P3",
        });
      } else {
        pushUnique(out, {
          productKey: "Proteína Capilar",
          step: "Prioridad",
          reason: "Prioridad reparación: Proteína Capilar 10 en 1.",
          evidence: "P5",
        });
      }
      break;
    case "nutrir":
      pushUnique(out, {
        productKey: "Dulce Renacer",
        step: "Prioridad",
        reason: "Tu prioridad es nutrirlo o hidratarlo.",
        evidence: "P5",
      });
      break;
    case "grasa":
    case "caspa":
      // Cubierto por alternativa de lavado / Scrub; no displazar base P1.
      break;
    case "caida":
    case "crecimiento":
      pushUnique(out, {
        productKey: "Secreto de Primavera",
        step: "Prioridad",
        reason: "Tu prioridad es fortalecer la caída o favorecer el crecimiento.",
        evidence: "P5",
      });
      pushUnique(out, {
        productKey: "Shots Capilares",
        step: "Prioridad",
        reason: "Dupla cosméticas con el tónico para esa prioridad.",
        evidence: "P5",
      });
      break;
    case "frizz":
      pushUnique(out, {
        productKey: "Shine Gloss",
        step: "Prioridad",
        reason: "Tu prioridad es controlar el frizz.",
        evidence: "P5",
      });
      break;
    case "brillo":
      pushUnique(out, {
        productKey: "Shine Gloss",
        step: "Prioridad",
        reason: "Tu prioridad es tener más brillo.",
        evidence: "P5",
      });
      break;
    case "puntas":
      pushUnique(out, {
        productKey: "Luna Llena",
        step: "Prioridad",
        reason: "Tu prioridad es reparar las puntas.",
        evidence: "P5",
      });
      pushUnique(out, {
        productKey: "Suspiros",
        step: "Prioridad",
        reason: "Dupla SOS de puntas.",
        evidence: "P5",
      });
      break;
    default:
      break;
  }
  return out;
}

function coverageFromP4(answers: EmmaAnswers, already: EmmaRoutineItem[]): EmmaRoutineItem[] {
  const out: EmmaRoutineItem[] = [];
  const has = (k: string) => already.some((x) => x.productKey === k) || out.some((x) => x.productKey === k);

  if (hasAny(answers.scalp, ["caida", "crecimiento"]) && !has("Secreto de Primavera")) {
    pushUnique(out, {
      productKey: "Secreto de Primavera",
      step: "Raíz",
      reason: "Marcaste caída o crecimiento lento en el cuero cabelludo.",
      evidence: "P4",
    });
    pushUnique(out, {
      productKey: "Shots Capilares",
      step: "Raíz",
      reason: "Acompañamiento del tónico por esa señal de raíz.",
      evidence: "P4",
    });
  }
  if (needsScrubGlow(answers) && !has("Scrub Glow")) {
    pushUnique(out, {
      productKey: "Scrub Glow",
      step: "Complemento",
      reason: "Complemento por caspa, descamación o acumulación (no sustituye el shampoo).",
      evidence: "P4/P5",
    });
  }
  return out;
}

function coverageFromP3(answers: EmmaAnswers, already: EmmaRoutineItem[]): EmmaRoutineItem[] {
  const out: EmmaRoutineItem[] = [];
  const has = (k: string) => already.some((x) => x.productKey === k) || out.some((x) => x.productKey === k);
  const f = answers.feelings;

  // Un tratamiento de fibra si hay señales y aún no hay protagonista de fibra
  const hasFiber = ["Dulce Renacer", "Sensación Primaveral", "Proteína Capilar"].some(has);
  if (!hasFiber && hasAny(f, ["resequedad", "dano", "quiebre", "enreda"])) {
    if (f.includes("resequedad") || f.includes("enreda")) {
      pushUnique(out, {
        productKey: "Dulce Renacer",
        step: "Tratamiento",
        reason: "Por resequedad o enredos en lo que me contaste.",
        evidence: "P3",
      });
    } else {
      pushUnique(out, {
        productKey: "Sensación Primaveral",
        step: "Tratamiento",
        reason: "Por daño/porosidad o quiebre en lo que me contaste.",
        evidence: "P3",
      });
    }
  }

  if ((f.includes("puntas") || answers.priority === "puntas") && !has("Luna Llena")) {
    pushUnique(out, {
      productKey: "Luna Llena",
      step: "Puntas",
      reason: "Marcaste puntas maltratadas.",
      evidence: "P3",
    });
  }

  if (hasAny(f, ["frizz", "opacidad"]) && !has("Shine Gloss") && answers.priority !== "brillo" && answers.priority !== "frizz") {
    // Solo si no satura: se evalúa en selectMinimal
    pushUnique(out, {
      productKey: "Shine Gloss",
      step: "Acabado",
      reason: "Por frizz u opacidad en tus señales.",
      evidence: "P3",
    });
  }

  return out;
}

function coverageFromP6(answers: EmmaAnswers, already: EmmaRoutineItem[]): EmmaRoutineItem[] {
  const out: EmmaRoutineItem[] = [];
  const has = (k: string) => already.some((x) => x.productKey === k);
  const needsProtect =
    hasAny(answers.exposure, ["calor", "sol", "piscina_mar"]) || answers.feelings.includes("frizz");
  if (needsProtect && !has("Fantasía Natural") && !answers.exposure.includes("ninguna")) {
    const why = answers.exposure.includes("calor")
      ? "Me contaste que usas calor con frecuencia."
      : answers.exposure.includes("sol")
        ? "Me contaste que expones tu cabello al sol."
        : answers.exposure.includes("piscina_mar")
          ? "Me contaste que tu cabello va a piscina o mar."
          : "Marcaste frizz y conviene sellar/proteger.";
    pushUnique(out, {
      productKey: "Fantasía Natural",
      step: "Protección",
      reason: why,
      evidence: "P6/P3",
    });
  }
  return out;
}

const VALID_P1 = new Set(["seco", "graso", "normal", "caspa_acumulacion"]);
const VALID_P5 = new Set([
  "reparar",
  "nutrir",
  "grasa",
  "caspa",
  "caida",
  "crecimiento",
  "frizz",
  "brillo",
  "puntas",
]);

export function validateEmmaAnswers(a: Partial<EmmaAnswers>): EmmaAnswers | null {
  if (!a.hairType || !VALID_P1.has(a.hairType)) return null;
  if (!a.priority || !VALID_P5.has(a.priority)) return null;
  const processes = normalizeExclusiveSelection(2, a.processes ?? []);
  const scalp = normalizeExclusiveSelection(4, a.scalp ?? []);
  const exposure = normalizeExclusiveSelection(6, a.exposure ?? []);
  return {
    hairType: a.hairType,
    processes,
    feelings: a.feelings ?? [],
    scalp,
    priority: a.priority,
    exposure,
  };
}

/** IDs de carrito: un solo lavado (base o alternativa) + módulos. Extra (mist) aparte. */
export function emmaCartProductKeys(
  rec: EmmaRecommendation,
  wash: "base" | "alternative" = "base",
): { routine: string[]; mist: string[] } {
  const washKey =
    wash === "alternative" && rec.alternativeWash
      ? rec.alternativeWash.productKey
      : rec.baseWash.productKey;
  const routine = [washKey, ...rec.primary.map((p) => p.productKey)].filter(
    (k, i, arr) => arr.indexOf(k) === i,
  );
  const mist = rec.extras.map((e) => e.productKey);
  return { routine, mist };
}

/**
 * Motor determinístico: base P1 inmutable, Scalp solo como alternativa,
 * P5 protagonista, sin rellenar hasta 5.
 */
export function buildEmmaRoutine(answers: EmmaAnswers): EmmaRecommendation {
  const p1 = WASH_BY_P1[answers.hairType] ?? WASH_BY_P1.normal!;
  const baseWash: EmmaRoutineItem = {
    productKey: p1.key,
    step: "Lavado base",
    reason: p1.reason,
    evidence: "P1",
  };

  const alternativeWash: EmmaRoutineItem | null = needsScalpAlternative(answers, p1.key)
    ? {
        productKey: "Kit Scalp Therapy",
        step: "Lavado alternativa",
        reason:
          "Como también mencionaste grasa, caspa, descamación o acumulación, puedes elegir Scalp Therapy como alternativa de lavado. No sustituye automáticamente tu base.",
        evidence: "P4/P5",
        optional: true,
      }
    : null;

  const modules: EmmaRoutineItem[] = [];
  for (const item of protagonistsFromP5(answers)) pushUnique(modules, item);
  for (const item of coverageFromP4(answers, modules)) pushUnique(modules, item);
  for (const item of coverageFromP3(answers, modules)) pushUnique(modules, item);
  for (const item of coverageFromP6(answers, modules)) pushUnique(modules, item);

  // Recorte por pertinencia: máx 4 módulos de tratamiento (lavado aparte). Nunca pad.
  const primary = modules.slice(0, 4);

  const extras: EmmaRoutineItem[] = [
    {
      productKey: "BloomShine",
      step: "Hair Mist",
      reason:
        "Y ahora la cerecita del helado 🍒💗: un Hair Mist Four Sensations para cerrar con ese toque que obsesiona. Es opcional y no es tratamiento de caspa ni caída.",
      optional: true,
      evidence: "upsell",
    },
  ];

  const p1Label =
    answers.hairType === "caspa_acumulacion"
      ? "caspa o acumulación"
      : answers.hairType === "seco"
        ? "seco"
        : answers.hairType === "graso"
          ? "graso"
          : "normal";
  const p5Opt = EMMA_QUESTIONS[4]?.options.find((o) => o.id === answers.priority);
  const summary = `¡Armé tu rutina escuchando todo lo que me contaste! 💗 Tu base de lavado responde a tu cabello ${p1Label}${
    p5Opt ? ` y tu prioridad #1 es «${p5Opt.label}»` : ""
  }. Aquí va lo que elegiría para ti.`;

  return {
    primary,
    extras,
    summary,
    baseWash,
    alternativeWash,
    defaultWashKey: baseWash.productKey,
  };
}

export const EMMA_LOADING_TEXT = "¡Listoooo! 💗 Voy a unir todo lo que me contaste para elegir tu rutina.";

export const EMMA_HAIR_MIST_KEYS = ["BloomShine", "Sweet Love", "Scarlette", "Golden Glow"] as const;

export function matchCatalogProductId(
  catalog: { id: string; name: string }[],
  productKey: string,
): string | null {
  const key = productKey
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const aliases: Record<string, string[]> = {
    "proteina capilar": ["proteina", "10 en 1"],
    "kit tentacion nutricion": ["tentacion nutricion", "kit tentacion nutricion"],
    "kit tentacion equilibrio": ["tentacion equilibrio", "kit tentacion equilibrio"],
    "kit scalp therapy": ["scalp therapy", "kit scalp"],
    "secreto de primavera": ["secreto de primavera"],
    "shots capilares": ["shot"],
    "scrub glow": ["scrub"],
    "fantasia natural": ["fantasia"],
    "shine gloss": ["shine gloss"],
    "dulce renacer": ["dulce renacer"],
    "sensacion primaveral": ["sensacion primaveral", "repolarizador"],
    "luna llena": ["luna llena"],
    suspiros: ["suspiros"],
    botanical: ["botanical"],
    bloomshine: ["bloomshine", "bloom shine", "hair mist"],
    "sweet love": ["sweet love"],
    scarlette: ["scarlette"],
    "golden glow": ["golden glow"],
  };
  const needles = aliases[key] ?? [key];
  const hit = catalog.find((p) => {
    const n = p.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return needles.some((needle) => n.includes(needle));
  });
  return hit?.id ?? null;
}
