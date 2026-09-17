export type BulkCsvTemplateKind = "general" | "tintes";

export type BulkCsvTemplateColumn = {
  header: string;
  required: boolean;
  description: string;
  example: string;
  aliases?: string[];
};

export const BULK_CSV_GENERAL_COLUMNS: BulkCsvTemplateColumn[] = [
  {
    header: "Código",
    required: true,
    description:
      "Identificador único del producto. Debe coincidir con el nombre del archivo de imagen en el ZIP (sin extensión).",
    example: "FS001",
    aliases: ["Codigo", "SKU", "Referencia", "Ref", "ID"],
  },
  {
    header: "Nombre",
    required: true,
    description: "Título del producto en la tienda.",
    example: "Dulce Renacer",
    aliases: ["Detalle", "Producto", "Título"],
  },
  {
    header: "Descripción",
    required: false,
    description: "Texto largo del producto. Si no hay columna Nombre, se usa la primera línea.",
    example: "Tratamiento nutritivo de la línea Four Sensations.",
    aliases: ["Descripcion"],
  },
  {
    header: "Categoría",
    required: true,
    description: "Nombre o slug de la categoría principal (debe existir en el menú o crearse en el preview).",
    example: "Cuidado capilar",
    aliases: ["Categoria", "Rubro"],
  },
  {
    header: "Subcategoría",
    required: false,
    description: "Subcategoría dentro de la categoría.",
    example: "Tratamientos",
    aliases: ["Subcategoria", "Sub categoría", "Línea"],
  },
  {
    header: "Marca",
    required: false,
    description: "Marca o fabricante del producto.",
    example: "Four Sensations",
    aliases: ["Brand", "Fabricante"],
  },
  {
    header: "Precio",
    required: true,
    description: "Precio de venta en COP (número entero, sin decimales).",
    example: "45000",
    aliases: ["Precio venta", "Valor", "PVP"],
  },
  {
    header: "Precio original",
    required: false,
    description: "Precio tachado / antes, si aplica promoción.",
    example: "52000",
    aliases: ["Precio tachado", "Precio anterior"],
  },
  {
    header: "Stock",
    required: false,
    description: "Unidades disponibles (entero ≥ 0).",
    example: "10",
    aliases: ["Inventario", "Cantidad"],
  },
  {
    header: "Etiquetas",
    required: false,
    description: "Etiquetas comerciales separadas por coma, punto y coma o |.",
    example: "nutricion,frizz",
    aliases: ["Tags", "Etiqueta", "Keywords"],
  },
  {
    header: "Barras",
    required: false,
    description:
      "Código de barras compartido: filas con el mismo valor se agrupan como variantes del mismo producto.",
    example: "7701234567890",
    aliases: ["Código de barras", "Codigo de barras", "EAN"],
  },
  {
    header: "Color",
    required: false,
    description:
      "Color del producto en hexadecimal (#RRGGBB o RRGGBB). Opcional: nombre después del hex o columna «Nombre color».",
    example: "#C41E3A",
    aliases: ["Colour", "Hex", "Color hex"],
  },
  {
    header: "Nombre color",
    required: false,
    description: "Nombre legible del color (ej. Rojo cereza). Opcional si va en la misma celda que Color.",
    example: "Rosa blush",
    aliases: ["Color nombre", "Nombre del color", "Shade"],
  },
];

export const BULK_CSV_TINTES_COLUMNS: BulkCsvTemplateColumn[] = [
  {
    header: "Categoría",
    required: true,
    description: "Debe ser la categoría Tintes (nombre o slug «tintes»).",
    example: "Tintes",
    aliases: ["Categoria"],
  },
  {
    header: "Familia",
    required: true,
    description: "Familia de tinte del catálogo (ej. ROYAL, VIBRANCE). Si falta, puede usarse la columna Marca.",
    example: "ROYAL",
    aliases: ["Familia tinte", "Marca tinte"],
  },
  {
    header: "Tipo",
    required: true,
    description: "Tipo o línea interna (si usas esa taxonomía). En la importación elegirás tipo + familia activos.",
    example: "Línea capilar",
    aliases: ["Tipo tinte", "Línea tinte", "Linea tinte"],
  },
  {
    header: "Nivel",
    required: true,
    description:
      "Código de color (ej. 7-77, 9,5-1). El nombre del archivo en el ZIP debe coincidir con este valor (sin extensión).",
    example: "7-77",
    aliases: ["Nivel tinte", "Tono", "Código color"],
  },
  {
    header: "Grupo",
    required: false,
    description: "Grupo de color dentro de la línea (para filtros en la tienda).",
    example: "7",
    aliases: ["Grupo tinte"],
  },
  {
    header: "Nombre",
    required: false,
    description: "Título del tinte. Si falta, se genera a partir de tipo + nivel.",
    example: "IGORA ROYAL 7-77",
    aliases: ["Detalle", "Producto"],
  },
  {
    header: "Descripción",
    required: false,
    description: "Texto descriptivo del producto.",
    example: "Rubio medio con reflejos dorados.",
    aliases: ["Descripcion"],
  },
  {
    header: "Precio",
    required: true,
    description: "Precio de venta en COP (entero).",
    example: "65000",
  },
  {
    header: "Stock",
    required: false,
    description: "Unidades disponibles.",
    example: "5",
  },
  {
    header: "Código",
    required: false,
    description: "Referencia interna opcional (para productos no-tinte también sirve como código de imagen).",
    example: "ROYAL-7-77",
    aliases: ["SKU", "Referencia"],
  },
  {
    header: "Barras",
    required: false,
    description: "Código de barras para agrupar variantes del mismo producto.",
    example: "7709876543210",
    aliases: ["Código de barras"],
  },
];

const GENERAL_SAMPLE_ROWS: string[][] = [
  [
    "FS-SHINE-GLOSS-45",
    "Shine Gloss",
    "Óleo capilar ultraligero. Brillo espejo, control de frizz, puntas pulidas sin efecto grasoso. Blend hidratante molecular. 45 mL. Precio de catálogo de referencia: validar vigente.",
    "Cuidado capilar",
    "Shine Gloss",
    "Four Sensations",
    "37000",
    "",
    "20",
    "brillo,frizz,finalizador",
    "",
  ],
  [
    "FS-SECRETO-PRIMAVERA",
    "Secreto de Primavera",
    "Tónico capilar de la línea Four Sensations. Precio a confirmar con el catálogo vigente.",
    "Cuidado capilar",
    "Secreto de Primavera",
    "Four Sensations",
    "0",
    "",
    "0",
    "tonico,capilar",
    "",
  ],
];

const TINTES_SAMPLE_ROWS: string[][] = [
  [
    "Tintes",
    "FS",
    "Four Sensations",
    "10-1",
    "10",
    "Referencia interna 10-1",
    "Fila de ejemplo. Esta taxonomía no sale en el menú público.",
    "0",
    "0",
    "FS-10-1",
    "",
  ],
];

export function getBulkTemplateColumns(kind: BulkCsvTemplateKind): BulkCsvTemplateColumn[] {
  return kind === "tintes" ? BULK_CSV_TINTES_COLUMNS : BULK_CSV_GENERAL_COLUMNS;
}

export function getBulkTemplateSampleRows(kind: BulkCsvTemplateKind): string[][] {
  return kind === "tintes" ? TINTES_SAMPLE_ROWS : GENERAL_SAMPLE_ROWS;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvContent(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}

export function getBulkCsvTemplateContent(kind: BulkCsvTemplateKind): string {
  if (kind === "tintes") {
    const headers = BULK_CSV_TINTES_COLUMNS.map((c) => c.header);
    return buildCsvContent(headers, TINTES_SAMPLE_ROWS);
  }
  const headers = BULK_CSV_GENERAL_COLUMNS.map((c) => c.header);
  return buildCsvContent(headers, GENERAL_SAMPLE_ROWS);
}

export function getBulkCsvTemplateFilename(kind: BulkCsvTemplateKind): string {
  return kind === "tintes" ? "plantilla-tintes-foursensations.csv" : "plantilla-productos-foursensations.csv";
}

export function getBulkExcelTemplateFilename(kind: BulkCsvTemplateKind): string {
  return kind === "tintes" ? "plantilla-tintes-foursensations.xlsx" : "plantilla-productos-foursensations.xlsx";
}

/** Descarga plantilla Excel (.xlsx) con columnas, ejemplos y filas vacías para editar. */
export async function downloadBulkExcelTemplate(kind: BulkCsvTemplateKind): Promise<void> {
  const XLSX = await import("xlsx");
  const columns = getBulkTemplateColumns(kind);
  const headers = columns.map((c) => c.header);
  const sampleRows = getBulkTemplateSampleRows(kind);

  const emptyRows = Array.from({ length: 25 }, () => headers.map(() => ""));

  const dataAoA: string[][] = [headers, ...sampleRows, ...emptyRows];
  const dataSheet = XLSX.utils.aoa_to_sheet(dataAoA);
  dataSheet["!cols"] = headers.map((h) => ({ wch: Math.min(Math.max(h.length + 4, 12), 36) }));

  const instructionsAoA: string[][] = [
    ["Columna", "¿Obligatoria?", "Descripción", "Ejemplo", "Sinónimos aceptados"],
    ...columns.map((c) => [
      c.header,
      c.required ? "Sí" : "No",
      c.description,
      c.example,
      c.aliases?.join(", ") ?? "",
    ]),
    [],
    ["IMPORTANTE"],
    ["Al terminar de editar, guarda como CSV UTF-8 (.csv) antes de subir en Carga masiva."],
    ["No subas el archivo .xlsx directamente — el sistema solo acepta .csv + ZIP de imágenes."],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsAoA);
  instructionsSheet["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 52 }, { wch: 22 }, { wch: 28 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, kind === "tintes" ? "Tintes" : "Productos");
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instrucciones");
  XLSX.writeFile(workbook, getBulkExcelTemplateFilename(kind));
}

/** @deprecated Usar downloadBulkExcelTemplate — conservado por compatibilidad interna. */
export function downloadBulkCsvTemplate(kind: BulkCsvTemplateKind): void {
  const bom = "\uFEFF";
  const body = getBulkCsvTemplateContent(kind);
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = getBulkCsvTemplateFilename(kind);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
