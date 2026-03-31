const map: Record<string, string> = {
  maquillaje: "Maquillaje",
  "cuidado-piel": "Cuidado piel",
  "cuidado-capilar": "Cuidado capilar",
  unas: "Uñas",
  hombres: "Hombres",
  accesorios: "Accesorios",
  mayorista: "Mayorista",
};

export function getCategoryLabel(cat: string): string {
  return map[cat] || cat;
}

export function catKeyFromDisplayName(cat: string): string {
  return cat
    .toLowerCase()
    .replace(/ /g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
