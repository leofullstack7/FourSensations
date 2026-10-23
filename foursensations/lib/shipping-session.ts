import {
  guessShippingZoneFromCity,
  isShippingZoneId,
  SHIPPING_ZONES,
  type ShippingZoneId,
} from "@/lib/checkout/shipping-zones";
import { searchColombiaCities } from "@/lib/checkout/colombia-cities";

export const SHIPPING_SESSION_KEY = "fs_shipping_session";

export type ShippingSessionPref = {
  /** Ya se preguntó ciudad (primera visita). */
  asked: boolean;
  city: string;
  department: string;
  zoneId: ShippingZoneId;
  /** Origen: prompt, botones, geolocalización o checkout. */
  source?: "prompt" | "zone" | "geo" | "checkout";
};

const MANIZALES = { lat: 5.0689, lng: -75.5174, city: "Manizales", department: "Caldas", zoneId: "manizales" as const };
const VILLAMARIA = { lat: 5.0453, lng: -75.515, city: "Villamaría", department: "Caldas", zoneId: "villamaria" as const };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function loadShippingSession(): ShippingSessionPref | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SHIPPING_SESSION_KEY) ?? localStorage.getItem(SHIPPING_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ShippingSessionPref>;
    if (!parsed || typeof parsed !== "object") return null;
    const zoneId = typeof parsed.zoneId === "string" && isShippingZoneId(parsed.zoneId) ? parsed.zoneId : null;
    if (!zoneId) return null;
    return {
      asked: Boolean(parsed.asked),
      city: typeof parsed.city === "string" ? parsed.city : SHIPPING_ZONES[zoneId].name,
      department: typeof parsed.department === "string" ? parsed.department : "",
      zoneId,
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

export function saveShippingSession(pref: ShippingSessionPref): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(pref);
  try {
    sessionStorage.setItem(SHIPPING_SESSION_KEY, payload);
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(SHIPPING_SESSION_KEY, payload);
  } catch {
    /* ignore */
  }
}

export function shippingPrefFromZone(
  zoneId: ShippingZoneId,
  source: ShippingSessionPref["source"] = "zone",
  current?: ShippingSessionPref | null,
): ShippingSessionPref {
  if (zoneId === "manizales") {
    return { asked: true, city: "Manizales", department: "Caldas", zoneId, source };
  }
  if (zoneId === "villamaria") {
    return { asked: true, city: "Villamaría", department: "Caldas", zoneId, source };
  }
  if (zoneId === "pickup") {
    return {
      asked: true,
      city: current?.city?.trim() || "Manizales",
      department: current?.department?.trim() || "Caldas",
      zoneId: "pickup",
      source,
    };
  }
  const city = current?.city?.trim() && guessShippingZoneFromCity(current.city) === "nacional" ? current.city : "";
  const department = city ? current?.department ?? "" : "";
  return { asked: true, city, department, zoneId: "nacional", source };
}

export function shippingPrefFromCity(
  city: string,
  department = "",
  source: ShippingSessionPref["source"] = "prompt",
): ShippingSessionPref {
  const zoneId = guessShippingZoneFromCity(city);
  let dept = department.trim();
  if (!dept) {
    const hit = searchColombiaCities(city, 1)[0];
    if (hit && hit.city.toLowerCase() === city.trim().toLowerCase()) dept = hit.department;
    else if (zoneId === "manizales" || zoneId === "villamaria") dept = "Caldas";
  }
  return {
    asked: true,
    city: city.trim(),
    department: dept,
    zoneId,
    source,
  };
}

/** Resuelve zona a partir de coordenadas (Manizales / Villamaría / nacional + reverse geocode suave). */
export async function resolveShippingFromCoords(
  lat: number,
  lng: number,
): Promise<ShippingSessionPref> {
  const dM = haversineKm(lat, lng, MANIZALES.lat, MANIZALES.lng);
  const dV = haversineKm(lat, lng, VILLAMARIA.lat, VILLAMARIA.lng);
  if (dM <= 14 && dM <= dV + 2) {
    return { asked: true, ...MANIZALES, source: "geo" };
  }
  if (dV <= 10) {
    return { asked: true, ...VILLAMARIA, source: "geo" };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&zoom=12&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        address?: { city?: string; town?: string; municipality?: string; village?: string; state?: string };
      };
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.municipality ||
        data.address?.village ||
        "";
      const department = data.address?.state || "";
      if (city.trim()) {
        return shippingPrefFromCity(city, department, "geo");
      }
    }
  } catch {
    /* fallback nacional */
  }

  return { asked: true, city: "", department: "", zoneId: "nacional", source: "geo" };
}
