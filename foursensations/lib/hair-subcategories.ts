import { defaultMenuConfig } from "@/lib/menu-config";

export const HAIR_SUBCATEGORY_ORDER = [
  "Tratamientos",
  "Rutinas",
  "Finalizadores",
  "Tónicos",
  "Fragancias",
  "Multiuso",
] as const;

export type HairSubcategoryName = (typeof HAIR_SUBCATEGORY_ORDER)[number];

const EXTRA_NAME_TO_SUB: Record<string, HairSubcategoryName> = {
  "scrub glow": "Tratamientos",
  "brumas capilares": "Fragancias",
  "crema autobronceadora": "Multiuso",
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const NAME_TO_SUB = (() => {
  const map = new Map<string, HairSubcategoryName>();
  const hair = defaultMenuConfig["Cuidado capilar"];
  if (!hair) return map;
  for (const [group, items] of Object.entries(hair.subs)) {
    const sub = group as HairSubcategoryName;
    map.set(normalizeName(group), sub);
    for (const item of items) {
      map.set(normalizeName(item), sub);
    }
  }
  for (const [name, sub] of Object.entries(EXTRA_NAME_TO_SUB)) {
    map.set(normalizeName(name), sub);
  }
  return map;
})();

export function hairSubcategoryForProductName(name: string): HairSubcategoryName | null {
  return NAME_TO_SUB.get(normalizeName(name)) ?? null;
}
