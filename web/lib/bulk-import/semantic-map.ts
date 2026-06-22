import { normalizeKey } from "./normalize";

type SynonymGroup = { keys: string[]; field: keyof SemanticMapped };

/** Sinónimos → campo lógico (header ya normalizado con normalizeKey). */
const GROUPS: SynonymGroup[] = [
  {
    field: "name",
    keys: [
      "detalle",
      "nombre",
      "nombre del producto",
      "nombre producto",
      "producto",
      "articulo",
      "artículo",
      "item",
      "descripcion corta",
      "descripcion del producto",
      "titulo",
      "titulo producto",
      "name",
    ],
  },
  {
    field: "description",
    keys: [
      "descripcion",
      "descripción",
      "descripcion larga",
      "texto largo",
      "texto",
      "notas",
      "observaciones",
      "contenido",
    ],
  },
  /** Atributos específicos de la categoría Tintes (columnas CSV opcionales). */
  {
    field: "tintFamily",
    keys: ["familia", "familia tinte", "marca tinte", "marca familia"],
  },
  {
    field: "tintType",
    keys: ["tipo", "tipo tinte", "linea tinte", "línea tinte"],
  },
  {
    field: "tintLevel",
    keys: ["nivel", "nivel tinte", "tono", "codigo color", "código color"],
  },
  {
    field: "tintGroup",
    keys: ["grupo", "grupo tinte"],
  },
  {
    field: "price",
    keys: ["precio", "precio venta", "precio de venta", "valor", "valor venta", "pvp", "price"],
  },
  {
    field: "originalPrice",
    keys: ["precio original", "precio tachado", "precio anterior", "antes"],
  },
  {
    field: "stock",
    keys: ["stock", "stock actual", "inventario", "cantidad", "qty"],
  },
  {
    field: "brand",
    keys: ["marca", "brand", "fabricante"],
  },
  {
    field: "subcategory",
    keys: [
      "sub categoria",
      "subcategoria",
      "sub-categoria",
      "subcategoría",
      "sub category",
      "sub linea",
      "sublinea",
      "sub-línea",
      "subgrupo",
      "sub grupo",
      "linea",
      "línea",
    ],
  },
  {
    field: "category",
    keys: [
      "categoria",
      "categoría",
      "category",
      "rubro",
      "departamento",
      "division",
      "división",
      "seccion",
      "sección",
      "linea principal",
      "linea",
    ],
  },
  {
    field: "tags",
    keys: [
      "etiquetas",
      "etiqueta",
      "etiquetas producto",
      "etiqueta producto",
      "tags",
      "tag",
      "keywords",
      "palabras clave",
      "labels",
      "label",
    ],
  },
];

export type SemanticMapped = {
  name: string | null;
  description: string | null;
  price: number | null;
  originalPrice: number | null;
  stock: number | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  /** Etiquetas comerciales del producto (varias columnas CSV se fusionan). */
  tags: string[];
  /** Familia de tinte (catálogo). Si el CSV solo tiene «Marca», se usa vía effectiveTintFamily. */
  tintFamily: string | null;
  /** Tipo/línea de tinte (catálogo) — valor CSV antes de resolver a id. */
  tintType: string | null;
  /** Código de nivel (ej. 9,5-1) — texto libre, no numérico. */
  tintLevel: string | null;
  /** Grupo de color dentro de la línea. */
  tintGroup: string | null;
};

function headerToField(normalizedHeader: string): keyof SemanticMapped | null {
  const h = normalizeKey(normalizedHeader);

  // 1) Match exacto primero para evitar que "subcategoria" caiga en "categoria".
  for (const g of GROUPS) {
    for (const k of g.keys) {
      if (h === normalizeKey(k)) return g.field;
    }
  }

  // 2) Match parcial con prioridad por longitud de key (más específica gana).
  let best: { field: keyof SemanticMapped; keyLen: number } | null = null;
  for (const g of GROUPS) {
    for (const kRaw of g.keys) {
      const k = normalizeKey(kRaw);
      if (!(h.includes(k) || k.includes(h))) continue;
      if (g.field === "category" && h.includes("sub")) continue;
      if (g.field === "tags" && h.includes("subcategor")) continue;
      if (!best || k.length > best.keyLen) {
        best = { field: g.field, keyLen: k.length };
      }
    }
  }
  return best?.field ?? null;
}

/** Primera coincidencia por columna (una columna → un campo). */
export function buildHeaderFieldMap(headers: string[]): Map<number, keyof SemanticMapped> {
  const map = new Map<number, keyof SemanticMapped>();
  for (let i = 0; i < headers.length; i++) {
    const f = headerToField(headers[i] ?? "");
    if (f) map.set(i, f);
  }
  return map;
}

/** Entero COP: quita separadores miles. */
export function parsePriceInt(raw: string): number | null {
  const cleaned = raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/cop/gi, "")
    .replace(/\$/g, "")
    .replace(/[^0-9.,-]/g, "");

  if (!cleaned) return null;
  if (cleaned.includes("-")) return null;

  // Si trae separador decimal al final (ej. 35.000,00 o 35,000.00), lo removemos para COP entero.
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decPos = Math.max(lastComma, lastDot);

  let compact = cleaned;
  if (decPos > -1) {
    const decimals = cleaned.slice(decPos + 1);
    const hasLikelyDecimals = /^\d{1,2}$/.test(decimals);
    if (hasLikelyDecimals) {
      compact = cleaned.slice(0, decPos);
    }
  }

  const digitsOnly = compact.replace(/[.,]/g, "").replace(/\D/g, "");
  if (!digitsOnly) return null;

  const n = parseInt(digitsOnly, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function parseStockInt(raw: string): number | null {
  const s = raw.replace(/\s/g, "");
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

const MAX_TAGS = 30;
const MAX_TAG_LEN = 60;

/** Divide por coma, punto y coma o |; recorta y deduplica (orden conservado). */
export function parseTagsFromCell(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/[,;|]/g).map((t) => t.trim()).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const clipped = p.length > MAX_TAG_LEN ? p.slice(0, MAX_TAG_LEN) : p;
    const k = clipped.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(clipped);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function mergeTagTokenLists(chunks: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    for (const t of chunk) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
      if (out.length >= MAX_TAGS) return out;
    }
  }
  return out;
}

function mergeTagsChunks(chunks: string[][]): string[] {
  return mergeTagTokenLists(chunks);
}

/**
 * Une tokens para enriquecer fila: etiquetas ya partidas, una sola celda con comas,
 * listas en descripción/nombre, etc.
 */
export function aggregateTokensForRowEnrichment(m: SemanticMapped): string[] {
  const chunks: string[][] = [];

  let fromTags = [...m.tags];
  if (fromTags.length === 1 && /[,;|]/.test(fromTags[0]!)) {
    fromTags = parseTagsFromCell(fromTags[0]!);
  }
  if (fromTags.length) chunks.push(fromTags);

  const desc = m.description?.trim() ?? "";
  if (desc.length > 0 && /[,;|]/.test(desc) && parseTagsFromCell(desc).length >= 2) {
    chunks.push(parseTagsFromCell(desc));
  }

  const rawName = m.name?.trim() ?? "";
  if (rawName.length > 0 && /[,;|]/.test(rawName) && parseTagsFromCell(rawName).length >= 3) {
    chunks.push(parseTagsFromCell(rawName));
  }

  let merged = mergeTagTokenLists(chunks);
  if (merged.length === 1 && /[,;|]/.test(merged[0]!)) {
    merged = parseTagsFromCell(merged[0]!);
  }
  return merged;
}

export function mapRowValues(
  values: string[],
  headerFieldMap: Map<number, keyof SemanticMapped>
): SemanticMapped {
  const tagChunks: string[][] = [];
  const out: SemanticMapped = {
    name: null,
    description: null,
    price: null,
    originalPrice: null,
    stock: null,
    brand: null,
    category: null,
    subcategory: null,
    tags: [],
    tintFamily: null,
    tintType: null,
    tintLevel: null,
    tintGroup: null,
  };
  headerFieldMap.forEach((field, col) => {
    const raw = (values[col] ?? "").trim();
    if (!raw) return;
    switch (field) {
      case "name":
        if (!out.name) out.name = raw;
        break;
      case "description":
        if (!out.description) out.description = raw;
        break;
      case "price":
        if (out.price == null) out.price = parsePriceInt(raw);
        break;
      case "originalPrice":
        if (out.originalPrice == null) out.originalPrice = parsePriceInt(raw);
        break;
      case "stock":
        if (out.stock == null) out.stock = parseStockInt(raw);
        break;
      case "brand":
        if (!out.brand) out.brand = raw;
        break;
      case "category":
        if (!out.category) out.category = raw;
        break;
      case "subcategory":
        if (!out.subcategory) out.subcategory = raw;
        break;
      case "tags":
        tagChunks.push(parseTagsFromCell(raw));
        break;
      case "tintFamily":
        if (!out.tintFamily) out.tintFamily = raw;
        break;
      case "tintType":
        if (!out.tintType) out.tintType = raw;
        break;
      case "tintLevel":
        if (!out.tintLevel) out.tintLevel = raw;
        break;
      case "tintGroup":
        if (!out.tintGroup) out.tintGroup = raw;
        break;
      default:
        break;
    }
  });
  out.tags = mergeTagsChunks(tagChunks);
  return out;
}

const MAX_TITLE_LEN = 240;

/** Nombre persistido en Product.name: siempre MAYÚSCULAS (importación masiva). */
export function normalizeProductNameForDb(raw: string): string {
  return raw.trim().toUpperCase();
}

/** Título para la tienda: nombre de columna o primera línea de descripción (CSV muy común). */
export function effectiveProductTitle(m: SemanticMapped): string | null {
  const n = m.name?.trim();
  if (n) return n.length > MAX_TITLE_LEN ? n.slice(0, MAX_TITLE_LEN) : n;
  const d = m.description?.trim();
  if (!d) return null;
  const line = d.split(/\r?\n/)[0]?.trim() ?? "";
  if (!line) return null;
  return line.length > MAX_TITLE_LEN ? line.slice(0, MAX_TITLE_LEN) : line;
}

/**
 * Rellena nombre / categoría / subcategoría / marca desde tokens en «etiquetas» cuando el CSV
 * trae varios datos en una sola columna (p. ej. EAN, código, rubro en mayúsculas, título mezclado).
 */
export function enrichSparseMappedFromTags(m: SemanticMapped, codeRaw: string): SemanticMapped {
  const tagPool = aggregateTokensForRowEnrichment(m);
  if (tagPool.length < 2) return m;

  let base: SemanticMapped = { ...m, tags: tagPool };
  if (m.name?.trim() && /[,;|]/.test(m.name) && parseTagsFromCell(m.name).length >= 3) {
    base = { ...base, name: null };
  }
  if (m.description?.trim() && /[,;|]/.test(m.description) && parseTagsFromCell(m.description).length >= 3) {
    base = { ...base, description: null };
  }

  const normCode = normalizeKey(codeRaw);
  const isEanLike = (t: string) => /^\d{8,15}$/.test(t.replace(/\s+/g, ""));
  const matchesCode = (t: string) => normCode.length > 0 && normalizeKey(t) === normCode;

  let tokens = base.tags.map((t) => t.trim()).filter((t) => t.length > 0);
  tokens = tokens.filter((t) => !isEanLike(t) && !matchesCode(t));
  tokens = tokens.filter((t) => {
    const p = parsePriceInt(t);
    if (p != null && t.replace(/\s/g, "").length <= 14) return false;
    return true;
  });
  tokens = tokens.filter((t) => !/^0+$/.test(t.replace(/\s/g, "")));

  /** Token corto de taxonomía: todo mayúsculas o una palabra tipo «Maquillaje». */
  const isNarrowTaxonomyToken = (t: string) => {
    const s = t.trim();
    if (s.length < 2 || s.length > 44) return false;
    if (s.includes(" ")) return false;
    const letters = s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
    if (letters.length < 2) return false;
    if (s.toUpperCase() === s && /[A-ZÁÉÍÓÚÑ]/.test(s)) return true;
    if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{1,22}$/.test(s)) return true;
    return false;
  };

  const shouty = tokens.filter(isNarrowTaxonomyToken);
  const nonShouty = tokens.filter((t) => !isNarrowTaxonomyToken(t));

  const out: SemanticMapped = { ...base, tags: [...base.tags] };

  if (!out.category?.trim() && shouty[0]) out.category = shouty[0];
  if (!out.subcategory?.trim() && shouty[1]) out.subcategory = shouty[1];

  if (!out.name?.trim()) {
    const titleLike =
      nonShouty.find(
        (t) =>
          t.length >= 10 &&
          /[A-Za-zÁÉÍÓÚÑáéíóú]/.test(t) &&
          (t.includes("+") || /[a-záéíóú]/.test(t))
      ) ??
      nonShouty.find((t) => t.length >= 14 && /[A-Za-zÁÉÍÓÚÑáéíóú]{5,}/.test(t)) ??
      nonShouty.find((t) => t.length >= 8 && /[A-Za-zÁÉÍÓÚÑáéíóú]/.test(t) && !/^\d+$/.test(t));
    if (titleLike) out.name = titleLike;
  }

  if (!out.brand?.trim()) {
    const twoWord = nonShouty.find((t) => {
      if (t === out.name) return false;
      const p = t.split(/\s+/).filter(Boolean);
      return p.length === 2 && t.length < 40 && !isNarrowTaxonomyToken(t);
    });
    if (twoWord) out.brand = twoWord;
  }

  const usedNorm = new Set<string>();
  for (const x of [out.name, out.category, out.subcategory, out.brand]) {
    const v = x?.trim();
    if (v) usedNorm.add(normalizeKey(v));
  }
  out.tags = out.tags.filter((t) => !usedNorm.has(normalizeKey(t.trim())));

  return out;
}
