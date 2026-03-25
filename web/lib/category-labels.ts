const map: Record<string, string> = {
  maquillaje: "Maquillaje",
  "cuidado-piel": "Cuidado Piel",
  "cuidado-capilar": "Cuidado Capilar",
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
