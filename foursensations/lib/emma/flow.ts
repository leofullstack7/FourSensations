/** Flujo de preguntas Emma (guía 09 + matriz Excel). */

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
  "¡Holaaa! 🌸✨ Soy Emma. Antes de recomendarte una rutina quiero conocer un poquito tu cabello. Son unas pregunticas súper fáciles y al final te muestro qué productos Four Sensations elegiría para ti. ¿Empezamos? ✨";

export const EMMA_START_BUTTON = "Sí, conozcamos mi cabello 💗";

export const EMMA_LEFT_COPY = {
  greeting: "Hola, soy Emma 💗 Tu aliada capilar Four Sensations.",
  body: "¿Frizz, resequedad, caída, grasa, caspa o daño? Cuéntame qué necesita tu cabello y juntas encontraremos la rutina y los productos Four Sensations que mejor se adapten a ti 👩🏻‍🦰🌸",
  hearts: ["TE ESCUCHO", "TE GUÍO", "TE RECOMIENDO"] as const,
};

export const EMMA_QUESTIONS: EmmaQuestion[] = [
  {
    id: 1,
    prompt: "Empecemos por lo básico 👀 ¿Cómo sientes normalmente tu cabello?",
    mode: "single",
    options: [
      { id: "seco", label: "Seco" },
      { id: "graso", label: "Graso" },
      { id: "mixto", label: "Mixto", hint: "Raíz grasa + puntas secas" },
      { id: "normal", label: "Normal" },
    ],
  },
  {
    id: 2,
    prompt: "Ahora cuéntame un poquito de su historia 💗 ¿Tu cabello tiene actualmente alguno de estos procesos?",
    mode: "multi",
    options: [
      { id: "natural", label: "Natural / sin procesos" },
      { id: "tinte", label: "Tinte" },
      { id: "decoloracion", label: "Decoloración ó Balayage" },
      { id: "alisado", label: "Keratina ó alisado" },
    ],
  },
  {
    id: 3,
    prompt: "Ahora sí, cuéntame qué estás sintiendo en tu cabello. Puedes marcar todo lo que aplique ✨",
    mode: "multi",
    options: [
      { id: "resequedad", label: "Resequedad" },
      { id: "frizz", label: "Frizz" },
      { id: "opacidad", label: "Opacidad / poco brillo" },
      { id: "dano", label: "Daño / porosidad" },
      { id: "quiebre", label: "Quiebre / debilidad" },
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
      { id: "caspa", label: "Caspa / descamación" },
      { id: "acumulacion", label: "Acumulación / pesadez" },
      { id: "caida", label: "Caída" },
      { id: "crecimiento", label: "Crecimiento lento" },
      { id: "ninguna", label: "Ninguna" },
    ],
  },
  {
    id: 5,
    prompt: "Ya te voy conociendo 💗 Pero si pudieras mejorar UNA sola cosa de tu cabello primero, ¿cuál sería?",
    mode: "single",
    options: [
      { id: "reparar", label: "Repararlo" },
      { id: "nutrir", label: "Nutrirlo / hidratarlo" },
      { id: "grasa", label: "Controlar grasa" },
      { id: "caspa", label: "Cuidar caspa / descamación" },
      { id: "caida", label: "Fortalecer y cuidar la caída" },
      { id: "crecimiento", label: "Favorecer el crecimiento" },
      { id: "frizz", label: "Controlar el frizz" },
      { id: "brillo", label: "Tener más brillo" },
      { id: "puntas", label: "Reparar mis puntas" },
    ],
  },
  {
    id: 6,
    prompt: "Última, prometido 😂💗 ¿A cuáles de estas cosas expones tu cabello con frecuencia?",
    mode: "multi",
    options: [
      { id: "calor", label: "🔥 Calor frecuente (plancha, secador, rizador)" },
      { id: "sol", label: "☀️ Sol / exposición al aire libre" },
      { id: "piscina", label: "🌊 Piscina o mar" },
      { id: "ejercicio", label: "🏃‍♀️ Ejercicio / sudor frecuente" },
      { id: "humedad", label: "💦 Humedad" },
      { id: "contaminacion", label: "🏙️ Contaminación Ambiental / Polución" },
      { id: "ninguna", label: "Ninguna de las anteriores" },
    ],
  },
];

const Q1_REACT: Record<string, string> = {
  seco: "Perfecto 💗 Ya tengo una primera pista. Ahora quiero conocer un poquito de la historia de tu cabello.",
  graso: "Anotado 💗 Esto me ayuda muchísimo a entender cómo se comporta tu cabello. Ahora cuéntame un poquito de su historia.",
  mixto: "Perfecto 💗 Raíz grasa + puntas secas, entendido. Ahora quiero saber un poquito más de la historia de tu cabello.",
  normal: "Súper 💗 Ya sé cómo se comporta normalmente tu cabello. Ahora cuéntame un poquito de su historia.",
};

const Q5_REACT: Record<string, string> = {
  reparar: "Anotadísimo 💗 Repararlo será nuestra prioridad número uno.",
  nutrir: "Perfecto 💗 Nutrirlo e hidratarlo va primero en tu lista.",
  grasa: "Listo 💗 Controlar la grasa será lo primero que ataquemos.",
  caspa: "Entendido 💗 Cuidar caspa y descamación será tu prioridad.",
  caida: "Anotado 💗 Fortalecer y cuidar la caída va primero.",
  crecimiento: "Súper 💗 Favorecer el crecimiento será el foco principal.",
  frizz: "Perfecto 💗 Controlar el frizz será lo primero.",
  brillo: "Amo 💗 Más brillo será nuestra prioridad ✨",
  puntas: "Listo 💗 Reparar tus puntas va número uno 💗",
};

export function emmaReactionForAnswer(questionId: number, selectedIds: string[]): string {
  if (questionId === 1) {
    return Q1_REACT[selectedIds[0] ?? ""] ?? "Perfecto 💗 Sigamos.";
  }
  if (questionId === 2) {
    if (selectedIds.includes("natural") && selectedIds.length === 1) {
      return "Perfecto ✨ Entonces partimos de un cabello sin procesos químicos. Ahora sí quiero saber cómo lo estás sintiendo.";
    }
    if (selectedIds.length > 1) {
      return "Perfecto, ya tengo clarísima esa parte de la historia de tu cabello 💗✨ Ahora sí quiero saber cómo lo estás sintiendo hoy.";
    }
    if (selectedIds.includes("decoloracion")) {
      return "Okeyyy, dato MUY importante 👀💗 Lo voy a tener en cuenta. Ahora sí quiero saber cómo estás sintiendo tu cabello actualmente.";
    }
    if (selectedIds.includes("tinte")) {
      return "Anotado 💗 El color es un dato importante para conocer mejor tu cabello. Ahora sí, cuéntame cómo lo estás sintiendo.";
    }
    if (selectedIds.includes("alisado")) {
      return "Anotadísimo 💗 Eso también cuenta para entender mejor tu cabello. Ahora dime cómo lo estás sintiendo actualmente.";
    }
    return "Perfecto 💗 Sigamos.";
  }
  if (questionId === 3) {
    return "Te escucho 💗 Ya guardé cómo estás sintiendo tu cabello. Ahora vamos a la raíz.";
  }
  if (questionId === 4) {
    if (selectedIds.includes("ninguna") && selectedIds.length === 1) {
      return "Perfecto 💗 Sin alertas en el cuero cabelludo por ahora. Sigamos.";
    }
    return "Anotado 💗 Ya tengo claro lo de tu cuero cabelludo. Una más y listo.";
  }
  if (questionId === 5) {
    return Q5_REACT[selectedIds[0] ?? ""] ?? "Perfecto 💗 Esa será nuestra prioridad.";
  }
  if (questionId === 6) {
    return "Listo 💗 Ya tengo el panorama completo. Dame un segundito…";
  }
  return "Perfecto 💗";
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
  /** Nombre canónico para matchear catálogo */
  productKey: string;
  reason: string;
  step: string;
};

function hasAny(ids: string[], set: string[]) {
  return set.some((x) => ids.includes(x));
}

/**
 * Motor de recomendación (Excel Emma_Motor): score + módulos, 3–5 principales.
 */
export function buildEmmaRoutine(answers: EmmaAnswers): {
  primary: EmmaRoutineItem[];
  extras: EmmaRoutineItem[];
  summary: string;
} {
  const groupA = hasAny(answers.feelings, ["frizz", "opacidad", "enreda"]);
  const groupB = hasAny(answers.feelings, ["resequedad", "quiebre", "dano"]);
  const tips = answers.feelings.includes("puntas") || answers.priority === "puntas";
  const groupC = hasAny(answers.scalp, ["grasa", "caspa", "acumulacion"]);
  const groupD = hasAny(answers.scalp, ["caida", "crecimiento"]);
  const needsProtect =
    answers.exposure.filter((x) => x !== "ninguna").length > 0 ||
    answers.priority === "frizz" ||
    answers.priority === "brillo" ||
    groupA;

  const primary: EmmaRoutineItem[] = [];
  const extras: EmmaRoutineItem[] = [];
  const push = (list: EmmaRoutineItem[], item: EmmaRoutineItem) => {
    if (list.some((x) => x.productKey === item.productKey)) return;
    list.push(item);
  };

  // 1. Limpieza
  if (answers.priority === "caspa" || (groupC && (answers.hairType === "graso" || answers.hairType === "mixto"))) {
    push(primary, {
      productKey: "Kit Scalp Therapy",
      step: "Limpieza",
      reason: "Por tu cuero cabelludo y prioridad de detox / grasa / caspa.",
    });
    if (groupC) {
      push(primary, {
        productKey: "Scrub Glow",
        step: "Detox",
        reason: "Para refrescar y limpiar el cuero cabelludo a profundidad.",
      });
    }
  } else if (answers.hairType === "seco") {
    push(primary, {
      productKey: "Kit Tentación Nutrición",
      step: "Limpieza",
      reason: "Base de limpieza para cabello seco.",
    });
  } else if (answers.hairType === "graso" || answers.hairType === "mixto") {
    push(primary, {
      productKey: "Kit Tentación Equilibrio",
      step: "Limpieza",
      reason: "Base de limpieza para raíz grasa / equilibrar.",
    });
  } else {
    push(primary, {
      productKey: "Botanical",
      step: "Limpieza",
      reason: "Shampoo base para cabello normal.",
    });
  }

  // 2. Prioridad #1
  switch (answers.priority) {
    case "reparar":
      push(primary, {
        productKey: "Proteína Capilar",
        step: "Prioridad",
        reason: "Pediste repararlo primero: Proteína 10 en 1 es la protagonista.",
      });
      break;
    case "nutrir":
      push(primary, {
        productKey: "Dulce Renacer",
        step: "Prioridad",
        reason: "Tu prioridad es nutrir / hidratar.",
      });
      break;
    case "grasa":
      push(primary, {
        productKey: "Kit Tentación Equilibrio",
        step: "Prioridad",
        reason: "Prioridad: controlar grasa.",
      });
      break;
    case "caspa":
      push(primary, {
        productKey: "Scrub Glow",
        step: "Prioridad",
        reason: "Prioridad: cuidar caspa / descamación.",
      });
      break;
    case "caida":
    case "crecimiento":
      push(primary, {
        productKey: "Secreto de Primavera",
        step: "Prioridad",
        reason: "Prioridad de crecimiento / caída: tónico.",
      });
      push(primary, {
        productKey: "Shots Capilares",
        step: "Prioridad",
        reason: "Dupla con el tónico para fortalecer.",
      });
      break;
    case "frizz":
    case "brillo":
      push(primary, {
        productKey: "Shine Gloss",
        step: "Prioridad",
        reason: "Prioridad de frizz / brillo: óleo finalizador.",
      });
      push(primary, {
        productKey: "Fantasía Natural",
        step: "Protección",
        reason: "Protección y sellado del look.",
      });
      break;
    case "puntas":
      push(primary, {
        productKey: "Luna Llena",
        step: "Puntas",
        reason: "Prioridad: reparar puntas.",
      });
      push(primary, {
        productKey: "Suspiros",
        step: "Puntas",
        reason: "Dupla SOS de puntas con Luna Llena.",
      });
      break;
    default:
      break;
  }

  // 3. Cuero / crecimiento si no cubierto
  if (groupD && !primary.some((p) => /Secreto|Shots/i.test(p.productKey))) {
    push(primary, {
      productKey: "Secreto de Primavera",
      step: "Raíz",
      reason: "Señales de caída o crecimiento lento.",
    });
    push(primary, {
      productKey: "Shots Capilares",
      step: "Raíz",
      reason: "Acompañamiento del tónico.",
    });
  }
  if (groupC && !primary.some((p) => /Scalp|Scrub/i.test(p.productKey))) {
    push(primary, {
      productKey: "Scrub Glow",
      step: "Detox",
      reason: "Señales de grasa / caspa / acumulación.",
    });
  }

  // 4. Fibra
  if (groupB && !primary.some((p) => /Proteína|Dulce|Sensación/i.test(p.productKey))) {
    push(primary, {
      productKey: answers.priority === "nutrir" ? "Sensación Primaveral" : "Proteína Capilar",
      step: "Tratamiento",
      reason: "Señales de resequedad, quiebre o daño.",
    });
  }

  // 5. Protección
  if (needsProtect && !primary.some((p) => /Fantasía/i.test(p.productKey))) {
    push(primary, {
      productKey: "Fantasía Natural",
      step: "Protección",
      reason: "Exposición diaria o necesidad de sellar / frizz.",
    });
  }
  if ((groupA || answers.priority === "brillo" || answers.priority === "frizz") && !primary.some((p) => /Shine/i.test(p.productKey))) {
    push(primary, {
      productKey: "Shine Gloss",
      step: "Acabado",
      reason: "Brillo, frizz o manejabilidad.",
    });
  }

  // 6. Puntas
  if (tips && !primary.some((p) => /Luna|Suspiros/i.test(p.productKey))) {
    push(primary, {
      productKey: "Luna Llena",
      step: "Puntas",
      reason: "Puntas maltratadas.",
    });
    push(primary, {
      productKey: "Suspiros",
      step: "Puntas",
      reason: "Dupla de puntas.",
    });
  }

  // Recorte a 5
  const trimmed = primary.slice(0, 5);
  const overflow = primary.slice(5);
  for (const item of overflow) push(extras, item);

  // Hair Mist extra
  push(extras, {
    productKey: "BloomShine",
    step: "Hair Mist",
    reason: "El toque final sensorial: perfume capilar Four Sensations.",
  });

  const summary =
    "Armé tu rutina escuchando TODO lo que me contaste: tipo de cabello, cómo lo sientes, tu cuero cabelludo, tu prioridad #1 y a qué lo expones. Aquí va lo que elegiría para ti 💗";

  return { primary: trimmed, extras: extras.slice(0, 2), summary };
}

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
    "kit tentacion nutricion": ["tentacion nutricion", "aguacate"],
    "kit tentacion equilibrio": ["tentacion equilibrio", "cebolla"],
    "kit scalp therapy": ["scalp therapy", "carbon"],
    "secreto de primavera": ["secreto de primavera"],
    "shots capilares": ["shot"],
    "scrub glow": ["scrub"],
    "fantasia natural": ["fantasia", "bloqueador"],
    "shine gloss": ["shine gloss"],
    "dulce renacer": ["dulce renacer"],
    "sensacion primaveral": ["sensacion primaveral", "repolarizador"],
    "luna llena": ["luna llena"],
    suspiros: ["suspiros"],
    botanical: ["botanical"],
    bloomshine: ["bloom", "bloomshine"],
    "sweet love": ["sweet love"],
    scarlette: ["scarlette"],
    "golden glow": ["golden glow"],
    "bomba capilar": ["bomba"],
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
