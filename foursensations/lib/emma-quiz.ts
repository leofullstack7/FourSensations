import { getCatalogProductCopy } from "@/lib/catalog-product-copy";
import { getStorefrontProductTitle } from "@/lib/product-storefront-copy";
import { normalizeMenuLookup } from "@/lib/store/menu-item-href";
import type { StoreProduct } from "@/lib/types/product";

export type EmmaOption = {
  id: string;
  label: string;
  hint?: string;
  emoji?: string;
};

export type EmmaQuestionId = "feel" | "history" | "symptoms" | "scalp" | "priority" | "exposure";

export type EmmaQuestion = {
  id: EmmaQuestionId;
  text: string;
  multiple: boolean;
  options: EmmaOption[];
  reaction: string;
};

export type EmmaAnswers = {
  feel?: string;
  history: string[];
  symptoms: string[];
  scalp: string[];
  priority?: string;
  exposure: string[];
};

export const EMMA_WELCOME =
  "¡Holaaa! 🌸✨Soy Emma. Antes de recomendarte una rutina quiero conocer un poquito tu cabello. Son unas pregunticas súper fáciles y al final te muestro qué productos Four Sensations elegiría para ti. ¿Empezamos? ✨";

export const EMMA_START_LABEL = "Sí, conozcamos mi cabello 💗";

export const EMMA_LOADING_TEXT = "🪄Emma está armando tu rutina✨";

export const EMMA_QUESTIONS: EmmaQuestion[] = [
  {
    id: "feel",
    text: "Empecemos por lo básico 👀 ¿Cómo sientes normalmente tu cabello?",
    multiple: false,
    reaction: "Listo, ya anoté cómo se siente tu cabello. Sigo escuchándote 💗",
    options: [
      { id: "seco", label: "Seco" },
      { id: "graso", label: "Graso" },
      { id: "mixto", label: "Mixto", hint: "Raíz grasa + puntas secas." },
      { id: "normal", label: "Normal" },
    ],
  },
  {
    id: "history",
    text: "Ahora cuéntame un poquito de su historia 💗 ¿Tu cabello tiene actualmente alguno de estos procesos?",
    multiple: true,
    reaction: "Gracias por contarme su historia, eso me ayuda un montón ✨",
    options: [
      { id: "natural", label: "Natural / sin procesos" },
      { id: "tinte", label: "Tinte" },
      { id: "decoloracion", label: "Decoloración ó Balayage" },
      { id: "keratina", label: "Keratina ó alisado" },
    ],
  },
  {
    id: "symptoms",
    text: "Ahora sí, cuéntame qué estás sintiendo en tu cabello. Puedes marcar todo lo que aplique ✨",
    multiple: true,
    reaction: "Te escucho. Voy tomando nota de todo lo que sientes, sin adelantarme 🌸",
    options: [
      { id: "resequedad", label: "Resequedad" },
      { id: "frizz", label: "Frizz" },
      { id: "opacidad", label: "Opacidad / poco brillo" },
      { id: "dano", label: "Daño / porosidad" },
      { id: "quiebre", label: "Quiebre / debilidad" },
      { id: "puntas", label: "Puntas maltratadas" },
      { id: "enredos", label: "Se enreda fácilmente" },
    ],
  },
  {
    id: "scalp",
    text: "Ahora vamos a la raíz 👀 ¿Notas alguna de estas situaciones en tu cuero cabelludo?",
    multiple: true,
    reaction: "Ok, también tengo el panorama de tu cuero cabelludo. Sigo atenta 👀",
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
    id: "priority",
    text: "Ya te voy conociendo 💗 Pero si pudieras mejorar UNA sola cosa de tu cabello primero, ¿cuál sería?",
    multiple: false,
    reaction: "Esa prioridad la voy a tener muy presente cuando arme tu rutina 💗",
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
    id: "exposure",
    text: "Última, prometido 😂💗 ¿A cuáles de estas cosas expones tu cabello con frecuencia?",
    multiple: true,
    reaction: "Ya tengo todo lo que necesitaba. Dame un segundito, voy a armar tu rutina con calma ✨",
    options: [
      { id: "calor", label: "Calor frecuente", emoji: "🔥", hint: "Plancha, secador, rizador" },
      { id: "sol", label: "Sol / exposición al aire libre", emoji: "☀️" },
      { id: "piscina", label: "Piscina o mar", emoji: "🌊" },
      { id: "ejercicio", label: "Ejercicio / sudor frecuente", emoji: "🏃‍♀️" },
      { id: "humedad", label: "Humedad", emoji: "💦" },
      { id: "contaminacion", label: "Contaminación Ambiental / Polución", emoji: "🏙️" },
    ],
  },
];

export const EMMA_CONTINUE_LABEL = "Listo, siguiente 💗";

export function emptyEmmaAnswers(): EmmaAnswers {
  return { history: [], symptoms: [], scalp: [], exposure: [] };
}

export function optionLabel(questionId: EmmaQuestionId, optionId: string): string {
  const q = EMMA_QUESTIONS.find((row) => row.id === questionId);
  return q?.options.find((o) => o.id === optionId)?.label ?? optionId;
}

function findProduct(products: StoreProduct[], name: string): StoreProduct | undefined {
  const key = normalizeMenuLookup(name);
  const exact = products.find((p) => normalizeMenuLookup(p.name) === key);
  if (exact) return exact;
  return products.find((p) => {
    const n = normalizeMenuLookup(p.name);
    return n.includes(key) || key.includes(n);
  });
}

function pushUnique(list: StoreProduct[], product: StoreProduct | undefined) {
  if (!product) return;
  if (list.some((p) => p.id === product.id)) return;
  list.push(product);
}

/** Motor provisional: cuando llegue el cuadro comercial de variables, se ajusta aquí. */
export function buildEmmaRoutine(
  answers: EmmaAnswers,
  products: StoreProduct[],
): {
  interpretation: string;
  productIds: string[];
  productHints: Record<string, string>;
  why: string;
} {
  const picked: StoreProduct[] = [];
  const hints: Record<string, string> = {};

  const feel = answers.feel;
  const priority = answers.priority;
  const history = answers.history;
  const symptoms = answers.symptoms;
  const scalp = answers.scalp.filter((id) => id !== "ninguna");
  const exposure = answers.exposure;

  const shampoo = (() => {
    if (feel === "graso" || scalp.includes("grasa") || scalp.includes("caspa") || scalp.includes("acumulacion")) {
      return findProduct(products, "Scalp Therapy") ?? findProduct(products, "Tentación Equilibrio");
    }
    if (feel === "mixto") return findProduct(products, "Tentación Equilibrio");
    if (feel === "seco" || symptoms.includes("resequedad")) return findProduct(products, "Tentación Nutrición");
    return findProduct(products, "Botanical");
  })();

  const priorityHero = (() => {
    switch (priority) {
      case "reparar":
        return findProduct(products, "Proteína 10 en 1") ?? findProduct(products, "Dulce Renacer");
      case "nutrir":
        return findProduct(products, "Dulce Renacer");
      case "grasa":
        return findProduct(products, "Tentación Equilibrio") ?? findProduct(products, "Scalp Therapy");
      case "caspa":
        return findProduct(products, "Scalp Therapy") ?? findProduct(products, "Scrub Glow");
      case "caida":
      case "crecimiento":
        return findProduct(products, "Secreto de Primavera") ?? findProduct(products, "Shots");
      case "frizz":
        return findProduct(products, "Shine Gloss") ?? findProduct(products, "Fantasía Natural");
      case "brillo":
        return findProduct(products, "Shine Gloss");
      case "puntas":
        return findProduct(products, "Luna Llena") ?? findProduct(products, "Suspiros");
      default:
        return findProduct(products, "Dulce Renacer");
    }
  })();

  pushUnique(picked, priorityHero);
  if (priorityHero && shampoo && shampoo.id !== priorityHero.id) pushUnique(picked, shampoo);

  if (history.includes("tinte") || history.includes("decoloracion") || symptoms.includes("dano")) {
    pushUnique(picked, findProduct(products, "Proteína 10 en 1"));
    hints[findProduct(products, "Proteína 10 en 1")?.id ?? ""] =
      "Para reconstruir fibra después de procesos o daño visible.";
  }
  if (symptoms.includes("resequedad") || feel === "seco") {
    pushUnique(picked, findProduct(products, "Dulce Renacer"));
  }
  if (symptoms.includes("frizz") || symptoms.includes("enredos") || feel === "seco") {
    pushUnique(picked, findProduct(products, "Sensación Primaveral"));
  }
  if (scalp.includes("caspa") || scalp.includes("acumulacion") || scalp.includes("grasa")) {
    pushUnique(picked, findProduct(products, "Scrub Glow"));
    pushUnique(picked, findProduct(products, "Cepillo Masajeador Capilar"));
  }
  if (scalp.includes("caida") || scalp.includes("crecimiento") || priority === "caida" || priority === "crecimiento") {
    pushUnique(picked, findProduct(products, "Shots"));
    pushUnique(picked, findProduct(products, "Secreto de Primavera"));
  }
  if (symptoms.includes("puntas") || priority === "puntas") {
    pushUnique(picked, findProduct(products, "Luna Llena"));
    pushUnique(picked, findProduct(products, "Suspiros"));
  }
  if (
    exposure.includes("calor") ||
    exposure.includes("sol") ||
    exposure.includes("piscina") ||
    exposure.includes("ejercicio") ||
    exposure.includes("humedad") ||
    exposure.includes("contaminacion") ||
    symptoms.includes("frizz") ||
    priority === "frizz" ||
    priority === "brillo"
  ) {
    pushUnique(picked, findProduct(products, "Fantasía Natural"));
    pushUnique(picked, findProduct(products, "Shine Gloss"));
  }

  const routine = picked.slice(0, 5);
  for (const product of routine) {
    if (hints[product.id]) continue;
    const copy = getCatalogProductCopy(product.name);
    const title = getStorefrontProductTitle(product.name);
    hints[product.id] = copy?.tagline || title.subtitle || "Lo elegí para tu rutina Four Sensations.";
  }

  const feelLabel = feel ? optionLabel("feel", feel).toLowerCase() : "tu tipo de cabello";
  const priorityLabel = priority ? optionLabel("priority", priority).toLowerCase() : "lo que más te urge";
  const processNote = history.includes("natural") && history.length === 1
    ? "sin procesos fuertes"
    : history.length
      ? `con ${history.map((id) => optionLabel("history", id).toLowerCase()).join(", ")}`
      : "con la historia que me contaste";

  const interpretation = `Ya te escuché completa 💗 Tu cabello se siente ${feelLabel}, ${processNote}, y lo primero que quieres es ${priorityLabel}. Con eso en mente armé una rutina Four Sensations corta: primero el gesto que más te urge y después los pasos que lo sostienen.`;

  const why = routine
    .map((product) => {
      const title = getStorefrontProductTitle(product.name);
      const copy = getCatalogProductCopy(product.name);
      const how = copy?.howTo ? ` Cómo usarlo: ${copy.howTo.split(/(?=\d\.)/)[0]?.trim() || copy.howTo.slice(0, 180)}` : "";
      return `• ${title.title}: ${hints[product.id] || title.subtitle}.${how}`;
    })
    .join("\n");

  return {
    interpretation,
    productIds: routine.map((p) => p.id),
    productHints: hints,
    why: `Te explico por qué elegí cada uno y cómo usarlos juntos:\n${why}`,
  };
}
