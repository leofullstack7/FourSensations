import type { BulkExistingPolicy } from "./variant-group-assign";

export type BulkRowStatusInfo = {
  label: string;
  /** Texto al pasar el mouse: por qué y qué hacer. */
  hint: string;
  tone: "ok" | "group" | "warn" | "error" | "existing";
};

type StatusRowInput = {
  errors: string[];
  warnings: string[];
  hasExisting: boolean;
  readyForVariantGroup: boolean;
  hasImageMatch: boolean;
  barcodeRaw: string | null;
  nameValue: string | null;
  categorySlug: string | null;
  subcategoryValue: string | null;
  priceValue: number | null;
};

/**
 * Etiqueta + descripción de estado para la tabla de match (hover).
 */
export function describeBulkRowStatus(
  r: StatusRowInput,
  existingPolicy: BulkExistingPolicy
): BulkRowStatusInfo {
  if (r.errors.length > 0) {
    const missing: string[] = [];
    for (const e of r.errors) {
      if (e.includes("Precio")) missing.push("precio válido");
      else if (e.includes("nombre") || e.includes("Nombre")) missing.push("nombre");
      else if (e.includes("categoría") || e.includes("Categoría")) missing.push("categoría");
      else if (e.includes("subcategoría") || e.includes("Subcategoría")) missing.push("subcategoría");
      else if (e.includes("Stock")) missing.push("stock");
      else if (e.includes("imagen") || e.includes("foto")) missing.push("imagen en el ZIP");
      else if (e.includes("tinte") || e.includes("Tinte") || e.includes("Tipo") || e.includes("Familia"))
        missing.push("tipo/familia de tinte");
      else if (e.includes("Código vacío")) missing.push("código de producto");
    }
    const unique = Array.from(new Set(missing));
    const what = unique.length > 0 ? unique.join(", ") : r.errors.slice(0, 3).join("; ");
    return {
      label: `✗ ${r.errors[0] ?? "Error"}`,
      hint: `Aún no se puede subir esta fila. Falta o falla: ${what}. Usa «Editar» para corregir los datos, o revisa el CSV/ZIP y vuelve a analizar.`,
      tone: "error",
    };
  }

  if (r.readyForVariantGroup) {
    return {
      label: "📦 Listo para agrupar",
      hint: "El producto ya está en la tienda y tiene código de barras (o color) para unirlo como variante. Márcalo y usa «Agrupar como variantes» o «Importar y agrupar». No se vuelve a crear el producto.",
      tone: "group",
    };
  }

  if (r.hasExisting) {
    if (existingPolicy === "replace") {
      return {
        label: "↺ Reemplazar",
        hint: "Este código ya existe en la tienda. Con la política «Reemplazar», al importar se actualizarán sus datos e imágenes desde el CSV.",
        tone: "existing",
      };
    }
    if (existingPolicy === "omit") {
      return {
        label: "⏭️ Omitir",
        hint: "Este código ya existe. Con «Omitir» no se modificará al importar. Si quieres unirlo a variantes, cambia la política o agrega código de barras en el CSV.",
        tone: "existing",
      };
    }
    if (r.barcodeRaw) {
      return {
        label: "⚠ Revisar fila",
        hint: "El producto ya está registrado y tiene barras en el CSV, pero aún no está listo para agrupar (revisa errores ignorados o datos incompletos). Usa «Editar» o verifica la columna Barras.",
        tone: "warn",
      };
    }
    return {
      label: "⛔ Sin código de barras",
      hint: "El producto ya está en la tienda pero el CSV no trae código de barras (columna Barras). Sin eso no se puede agrupar como variante. Añade el mismo valor de barras a las filas que deben ser variantes y vuelve a analizar.",
      tone: "warn",
    };
  }

  if (!r.hasImageMatch) {
    return {
      label: "⚠ Sin foto",
      hint: "No hay imagen en el ZIP que coincida con el código de esta fila. Renombra la foto (sin extensión = código del CSV), optimiza el ZIP o cambia la columna de match, y vuelve a analizar. Sin foto no se recomienda importar.",
      tone: "warn",
    };
  }

  if (r.warnings.length > 0) {
    return {
      label: "⚠ Aviso",
      hint: `La fila se puede importar, pero hay avisos: ${r.warnings.join(" · ")}. Revisa si quieres corregirlos con «Editar» antes de subir.`,
      tone: "warn",
    };
  }

  return {
    label: "✓ OK",
    hint: "Listo para importar como producto nuevo: tiene match de imagen y no hay errores bloqueantes. Márcalo y usa «Importar productos nuevos» o «Importar y agrupar».",
    tone: "ok",
  };
}

export function bulkRowIsStatusOk(r: StatusRowInput): boolean {
  return describeBulkRowStatus(r, "skip").tone === "ok";
}

/** Paleta ciclada para grupos de variantes (header + fila suave). */
export const VARIANT_GROUP_COLORS = [
  {
    name: "azul",
    headerBg: "#dbeafe",
    headerBorder: "#3b82f6",
    headerText: "#1e3a8a",
    rowBg: "rgba(59, 130, 246, 0.10)",
  },
  {
    name: "amarillo",
    headerBg: "#fef9c3",
    headerBorder: "#ca8a04",
    headerText: "#713f12",
    rowBg: "rgba(202, 138, 4, 0.12)",
  },
  {
    name: "naranja",
    headerBg: "#ffedd5",
    headerBorder: "#ea580c",
    headerText: "#7c2d12",
    rowBg: "rgba(234, 88, 12, 0.10)",
  },
  {
    name: "morado",
    headerBg: "#f3e8ff",
    headerBorder: "#9333ea",
    headerText: "#581c87",
    rowBg: "rgba(147, 51, 234, 0.10)",
  },
  {
    name: "verde",
    headerBg: "#dcfce7",
    headerBorder: "#16a34a",
    headerText: "#14532d",
    rowBg: "rgba(22, 163, 74, 0.10)",
  },
] as const;

export function variantGroupColorAt(index: number) {
  return VARIANT_GROUP_COLORS[index % VARIANT_GROUP_COLORS.length]!;
}

export type VariantGroupColor = (typeof VARIANT_GROUP_COLORS)[number];
