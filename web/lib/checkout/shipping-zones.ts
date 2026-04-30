/** Umbral en COP: por encima, envío gratis en todas las zonas (excepto lógica de tarifa base 0 en recogida). */
export const CHECKOUT_FREE_SHIPPING_THRESHOLD_COP = 150_000;

export const SHIPPING_ZONE_IDS = [
  "bogota",
  "regional",
  "nacional-principal",
  "nacional-resto",
  "pickup",
] as const;

export type ShippingZoneId = (typeof SHIPPING_ZONE_IDS)[number];

export type ShippingZoneDef = {
  id: ShippingZoneId;
  icon: string;
  name: string;
  shortLabel: string;
  /** Tarifa cuando el subtotal es ≤ umbral (COP). */
  rateSubtotalLow: number;
};

export const SHIPPING_ZONES: Record<ShippingZoneId, ShippingZoneDef> = {
  bogota: {
    id: "bogota",
    icon: "🏍️",
    name: "Bogotá y Soacha",
    shortLabel: "Bogotá y Soacha",
    rateSubtotalLow: 9_000,
  },
  regional: {
    id: "regional",
    icon: "🚚",
    name: "Regional (Chía, Cajicá, Zipaquirá, Funza, Madrid)",
    shortLabel: "Regional",
    rateSubtotalLow: 12_000,
  },
  "nacional-principal": {
    id: "nacional-principal",
    icon: "📦",
    name: "Nacional principal (Medellín, Cali, Barranquilla, Bucaramanga)",
    shortLabel: "Nacional principal",
    rateSubtotalLow: 14_500,
  },
  "nacional-resto": {
    id: "nacional-resto",
    icon: "🌎",
    name: "Nacional resto (ciudades intermedias)",
    shortLabel: "Nacional resto",
    rateSubtotalLow: 19_900,
  },
  pickup: {
    id: "pickup",
    icon: "🏪",
    name: "Recoger en tienda",
    shortLabel: "Recoger en tienda",
    rateSubtotalLow: 0,
  },
};

export function isShippingZoneId(v: string): v is ShippingZoneId {
  return (SHIPPING_ZONE_IDS as readonly string[]).includes(v);
}

/** Costo de envío en COP según zona y subtotal (servidor y cliente deben usar la misma función). */
export function checkoutShippingCop(zoneId: ShippingZoneId, subtotalCop: number): number {
  const z = SHIPPING_ZONES[zoneId];
  if (!z) return 0;
  if (zoneId === "pickup") return 0;
  if (subtotalCop > CHECKOUT_FREE_SHIPPING_THRESHOLD_COP) return 0;
  return z.rateSubtotalLow;
}

export function shippingZoneContextMessage(zoneId: ShippingZoneId): string | null {
  switch (zoneId) {
    case "bogota":
      return "Bogotá Express: recibe hoy mismo si compras antes de las 12:00 m. (Lunes a Viernes)";
    case "pickup":
      return "Te enviaremos un mensaje de WhatsApp cuando tu pedido esté listo (aprox. 4 horas hábiles). Por favor no acudir a la tienda sin confirmación previa.";
    default:
      return null;
  }
}

export const CHECKOUT_BULK_SHIPPING_NOTICE =
  "Para pedidos con productos de gran volumen (kits capilares, compras mayoristas), nuestro equipo se contactará contigo para coordinar el flete si aplica.";

export const CHECKOUT_COURIER_NOTE =
  "Los envíos se gestionan por Servientrega, Interrapidísimo o mensajería personalizada. No ofrecemos pago contra entrega.";
