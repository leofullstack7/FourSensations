import { getEpaycoServerConfig } from "@/lib/server/epayco/env";

/**
 * Consulta pública de referencia ePayco (para enlazar `ref_payco` de la URL de respuesta con `invoice`).
 * @see https://docs.epayco.com/docs/checkout-respuesta-y-confirmacion
 */
export async function fetchEpaycoReferenceValidation(refPayco: string): Promise<unknown | null> {
  const { validationBase } = getEpaycoServerConfig();
  const url = `${validationBase}/${encodeURIComponent(refPayco)}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn("[epayco] validation lookup HTTP", res.status, text.slice(0, 200));
      return null;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { raw: text };
    }
  } catch (e) {
    console.error("[epayco] validation lookup error", e);
    return null;
  }
}

/** Intenta extraer el número de factura / invoice del JSON de validación. */
export function extractInvoiceFromValidationJson(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const candidates = [o.x_id_invoice, o.invoice, o.data];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
    if (c && typeof c === "object") {
      const inner = c as Record<string, unknown>;
      const inv = inner.x_id_invoice ?? inner.invoice;
      if (typeof inv === "string" && inv.trim()) return inv.trim();
    }
  }
  return null;
}
