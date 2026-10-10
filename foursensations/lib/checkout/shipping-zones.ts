import { findEnviaExclusion, isEnviaReexpedition } from "@/lib/checkout/envia-exclusions";

export const SHIPPING_ZONE_IDS = ["manizales", "villamaria", "nacional"] as const;

export type ShippingZoneId = (typeof SHIPPING_ZONE_IDS)[number];
export type ShippingCarrier = "envia" | "interrapidismo";

export type ShippingZoneDef = {
  id: ShippingZoneId;
  icon: string;
  name: string;
  shortLabel: string;
  rateSubtotalLow: number;
};

export const SHIPPING_ZONES: Record<ShippingZoneId, ShippingZoneDef> = {
  manizales: {
    id: "manizales",
    icon: "☕",
    name: "Manizales",
    shortLabel: "Manizales",
    rateSubtotalLow: 8_000,
  },
  villamaria: {
    id: "villamaria",
    icon: "🌿",
    name: "Villamaría",
    shortLabel: "Villamaría",
    rateSubtotalLow: 10_000,
  },
  nacional: {
    id: "nacional",
    icon: "📦",
    name: "Nacional",
    shortLabel: "Nacional",
    rateSubtotalLow: 15_900,
  },
};

export function isShippingZoneId(v: string): v is ShippingZoneId {
  return (SHIPPING_ZONE_IDS as readonly string[]).includes(v);
}

export function guessShippingZoneFromCity(city: string): ShippingZoneId {
  const key = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (key === "manizales") return "manizales";
  if (key === "villamaria" || key === "villa maria") return "villamaria";
  return "nacional";
}

export function resolveShippingCarrier(city: string, department?: string): ShippingCarrier {
  return isEnviaReexpedition(city, department) ? "interrapidismo" : "envia";
}

export function checkoutShippingCop(
  zoneId: ShippingZoneId,
  context?: { city?: string; region?: string; carrier?: ShippingCarrier },
): number {
  const city = context?.city ?? "";
  const region = context?.region;
  const carrier = context?.carrier ?? resolveShippingCarrier(city, region);
  if (carrier === "interrapidismo") return 0;
  return SHIPPING_ZONES[zoneId]?.rateSubtotalLow ?? 0;
}

export function shippingZoneContextMessage(
  zoneId: ShippingZoneId,
  carrier: ShippingCarrier,
  city?: string,
  region?: string,
): string | null {
  if (carrier === "interrapidismo") {
    const hit = city ? findEnviaExclusion(city, region) : null;
    const place = hit ? `${hit.city} (${hit.department})` : "este destino";
    return `Envía no tiene cobertura en ${place}. Debes pedirlo por Interrapidísimo. El flete se paga contraentrega.`;
  }
  switch (zoneId) {
    case "manizales":
      return "Cobertura Envía en Manizales. Despachamos desde Manizales; el plazo de 2 días hábiles es para preparar el pedido.";
    case "villamaria":
      return "Cobertura Envía en Villamaría. Despachamos desde Manizales; el tránsito lo define Envía.";
    default:
      return "Cobertura Envía nacional. No incluye zonas de reexpedición: esos destinos van por Interrapidísimo y el envío se paga contraentrega.";
  }
}

export const CHECKOUT_BULK_SHIPPING_NOTICE =
  "Para pedidos mayoristas o de gran volumen, el equipo puede contactarte para indicarte el valor del flete contraentrega";

export const CHECKOUT_COURIER_NOTE =
  "Despacho desde Manizales, Caldas. Transportadora principal: Envía. En zonas sin cobertura de Envía: Interrapidísimo, con flete contraentrega.";

export const ENVIA_NO_REEXPEDITION_NOTE = "NO INCLUYE ZONAS DE REEXPEDICIÓN";
