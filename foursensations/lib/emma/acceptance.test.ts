/**
 * Casos T01–T10 del instructivo / hoja Pruebas P1 alternativa.
 * Ejecutar: npx tsx lib/emma/acceptance.test.ts
 */
import { buildEmmaRoutine, type EmmaAnswers } from "./flow";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function run(name: string, answers: EmmaAnswers, check: (r: ReturnType<typeof buildEmmaRoutine>) => void) {
  const r = buildEmmaRoutine(answers);
  check(r);
  console.log("OK", name);
}

run(
  "T01 Graso + brillo sin Scalp alt",
  {
    hairType: "graso",
    processes: ["decoloracion"],
    feelings: ["frizz", "opacidad"],
    scalp: ["ninguno"],
    priority: "brillo",
    exposure: ["ninguna"],
  },
  (r) => {
    assert(r.baseWash.productKey === "Kit Tentación Equilibrio", "base Equilibrio");
    assert(r.alternativeWash == null, "sin alternativa Scalp");
    assert(r.primary.some((p) => p.productKey === "Shine Gloss"), "Shine Gloss");
  },
);

run(
  "T02 Graso + caspa → Equilibrio + Scalp alt + Scrub",
  {
    hairType: "graso",
    processes: ["tinte"],
    feelings: [],
    scalp: ["caspa", "descamacion"],
    priority: "caspa",
    exposure: ["ninguna"],
  },
  (r) => {
    assert(r.baseWash.productKey === "Kit Tentación Equilibrio", "base Equilibrio");
    assert(r.alternativeWash?.productKey === "Kit Scalp Therapy", "alt Scalp");
    assert(r.primary.some((p) => p.productKey === "Scrub Glow"), "Scrub Glow");
  },
);

run(
  "T05 P1 Scalp no duplica alternativa",
  {
    hairType: "caspa_acumulacion",
    processes: ["natural"],
    feelings: [],
    scalp: ["caspa"],
    priority: "caspa",
    exposure: ["ninguna"],
  },
  (r) => {
    assert(r.baseWash.productKey === "Kit Scalp Therapy", "base Scalp");
    assert(r.alternativeWash == null, "sin alternativa duplicada");
  },
);

run(
  "T06 Graso + solo caída → sin Scalp alt",
  {
    hairType: "graso",
    processes: ["natural"],
    feelings: [],
    scalp: ["caida", "crecimiento"],
    priority: "caida",
    exposure: ["ninguna"],
  },
  (r) => {
    assert(r.baseWash.productKey === "Kit Tentación Equilibrio", "base Equilibrio");
    assert(r.alternativeWash == null, "caída no activa Scalp");
    assert(r.primary.some((p) => p.productKey === "Secreto de Primavera"), "Tónico");
    assert(r.primary.some((p) => p.productKey === "Shots Capilares"), "Shots");
  },
);

run(
  "Botanical nunca por P1 graso",
  {
    hairType: "graso",
    processes: ["natural"],
    feelings: ["frizz"],
    scalp: ["ninguno"],
    priority: "brillo",
    exposure: ["ninguna"],
  },
  (r) => {
    assert(r.baseWash.productKey !== "Botanical", "no Botanical en graso");
    assert(!r.primary.some((p) => p.productKey === "Botanical"), "Botanical no en módulos");
  },
);

console.log("Todas las pruebas Emma OK");
