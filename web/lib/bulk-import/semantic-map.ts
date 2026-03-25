import { normalizeKey } from "./normalize";

type SynonymGroup = { keys: string[]; field: keyof SemanticMapped };

/** Sinónimos → campo lógico (header ya normalizado con normalizeKey). */
const GROUPS: SynonymGroup[] = [
  {
    field: "name",
    keys: ["detalle", "nombre", "producto", "descripcion corta", "titulo", "name"],
  },
  {
    field: "description",
    keys: ["descripcion", "descripción", "texto", "notas"],
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
      "linea",
      "línea",
    ],
  },
  {
    field: "category",
    keys: ["categoria", "categoría", "category", "rubro", "linea principal", "linea"],
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

export function mapRowValues(
  values: string[],
  headerFieldMap: Map<number, keyof SemanticMapped>
): SemanticMapped {
  const out: SemanticMapped = {
    name: null,
    description: null,
    price: null,
    originalPrice: null,
    stock: null,
    brand: null,
    category: null,
    subcategory: null,
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
      default:
        break;
    }
  });
  return out;
}
