/**
 * Casos T01–T10 / aceptación. Ejecutar: npx tsx lib/emma/acceptance.test.ts
 */
import { buildEmmaRoutine, validateEmmaAnswers, type EmmaAnswers } from "./flow";
import { assertNoForbiddenClaims, explainEmmaItem } from "./explanations";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function run(name: string, answers: EmmaAnswers, check: (r: ReturnType<typeof buildEmmaRoutine>) => void) {
  const valid = validateEmmaAnswers(answers);
  assert(!!valid, `${name}: answers inválidas`);
  const r = buildEmmaRoutine(valid!);
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
  "T03 Seco + acumulación → Nutrición + Scalp alt",
  {
    hairType: "seco",
    processes: ["natural"],
    feelings: ["resequedad"],
    scalp: ["acumulacion"],
    priority: "nutrir",
    exposure: ["ninguna"],
  },
  (r) => {
    assert(r.baseWash.productKey === "Kit Tentación Nutrición", "base Nutrición");
    assert(r.alternativeWash?.productKey === "Kit Scalp Therapy", "alt Scalp");
    assert(r.primary.some((p) => p.productKey === "Dulce Renacer"), "Dulce");
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
  "Caso A seco nutrir + calor",
  {
    hairType: "seco",
    processes: ["natural"],
    feelings: ["resequedad", "dano", "enreda"],
    scalp: ["ninguno"],
    priority: "nutrir",
    exposure: ["calor"],
  },
  (r) => {
    assert(r.baseWash.productKey === "Kit Tentación Nutrición", "Nutrición");
    assert(r.primary.some((p) => p.productKey === "Dulce Renacer"), "Dulce");
    assert(r.primary.some((p) => p.productKey === "Fantasía Natural"), "Fantasía");
    assert(!r.primary.some((p) => p.productKey === "Proteína Capilar"), "no proteína por defecto");
  },
);

run(
  "Botanical nunca por P1 graso + claims",
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
    const text = explainEmmaItem(r.baseWash);
    assert(assertNoForbiddenClaims(text, r.baseWash.productKey), "claims base OK");
  },
);

run(
  "Normal + caspa → Botanical base + Scalp alt",
  {
    hairType: "normal",
    processes: ["tinte"],
    feelings: ["puntas"],
    scalp: ["caspa"],
    priority: "puntas",
    exposure: ["ninguna"],
  },
  (r) => {
    assert(r.baseWash.productKey === "Botanical", "Botanical base");
    assert(r.alternativeWash?.productKey === "Kit Scalp Therapy", "Scalp alt");
    assert(r.primary.some((p) => p.productKey === "Luna Llena"), "Luna Llena");
    const botanicalWhy = explainEmmaItem(r.baseWash);
    assert(assertNoForbiddenClaims(botanicalWhy, "Botanical"), "Botanical sin detox");
  },
);

console.log("Todas las pruebas Emma OK");
