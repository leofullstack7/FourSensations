/** Tarifas de referencia en COP (el PDF oficial no publica umbral de envío gratis). */
export const SHIPPING_ZONE_IDS = [
  "bogota",
  "regional",
  "nacional-principal",
  "nacional-resto",
] as const;

export type ShippingZoneId = (typeof SHIPPING_ZONE_IDS)[number];

export type ShippingZoneDef = {
  id: ShippingZoneId;
  icon: string;
  name: string;
  shortLabel: string;
  rateSubtotalLow: number;
};

export const SHIPPING_ZONES: Record<ShippingZoneId, ShippingZoneDef> = {
  bogota: {
    id: "bogota",
    icon: "☕",
    name: "Manizales y Caldas",
    shortLabel: "Manizales y Caldas",
    rateSubtotalLow: 9_000,
  },
  regional: {
    id: "regional",
    icon: "🚚",
    name: "Eje cafetero y ciudades cercanas",
    shortLabel: "Regional",
    rateSubtotalLow: 12_000,
  },
  "nacional-principal": {
    id: "nacional-principal",
    icon: "📦",
    name: "Ciudades principales (Medellín, Cali, Bogotá, Barranquilla, Bucaramanga)",
    shortLabel: "Nacional principal",
    rateSubtotalLow: 14_500,
  },
  "nacional-resto": {
    id: "nacional-resto",
    icon: "🌎",
    name: "Resto de Colombia (incluye zonas con reexpedición)",
    shortLabel: "Nacional resto",
    rateSubtotalLow: 19_900,
  },
};

export function isShippingZoneId(v: string): v is ShippingZoneId {
  return (SHIPPING_ZONE_IDS as readonly string[]).includes(v);
}

export function checkoutShippingCop(zoneId: ShippingZoneId, _subtotalCop: number): number {
  return SHIPPING_ZONES[zoneId]?.rateSubtotalLow ?? 0;
}

export function shippingZoneContextMessage(zoneId: ShippingZoneId): string | null {
  switch (zoneId) {
    case "bogota":
      return "Despachamos desde Manizales. El plazo de 2 días hábiles es para preparar el pedido; el tránsito lo define la transportadora.";
    default:
      return "Cobertura a todo Colombia. Transportadora principal: Envía. En reexpedición: Interrapidísimo.";
  }
}

export const CHECKOUT_BULK_SHIPPING_NOTICE =
  "Para pedidos mayoristas o de gran volumen, el equipo puede contactarte para coordinar el flete si aplica.";

export const CHECKOUT_COURIER_NOTE =
  "Despacho desde Manizales, Caldas. Transportadora principal Envía; Interrapidísimo en municipios con reexpedición. No ofrecemos pago contra entrega ni recogida en tienda.";
