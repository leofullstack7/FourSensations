/** Formas públicas / admin del JSON `SiteSettings.data`. */

export type MegaPromoImageSlot = {
  imageUrl: string;
  href?: string;
  label?: string;
};

export type MegaPromoByCategory = Record<string, MegaPromoImageSlot[]>;

export const LANDING_COLLAGE_SLUGS = ["cuidado-capilar", "cuidado-corporal", "accesorios"] as const;
export type LandingCollageSlug = (typeof LANDING_COLLAGE_SLUGS)[number];
export type LandingCollages = Record<LandingCollageSlug, [string, string, string]>;

export type SiteSettingsData = {
  megaPromo?: MegaPromoByCategory;
  landingCollages?: LandingCollages;
  [key: string]: unknown;
};

export function normalizeLandingCollages(raw: unknown): LandingCollages {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as LandingCollages;
  for (const slug of LANDING_COLLAGE_SLUGS) {
    const slots = Array.isArray(source[slug]) ? source[slug] : [];
    const urls = slots.slice(0, 3).map((slot) => (typeof slot === "string" ? slot.trim() : ""));
    while (urls.length < 3) urls.push("");
    out[slug] = [urls[0] ?? "", urls[1] ?? "", urls[2] ?? ""];
  }
  return out;
}

export function landingCollageUrls(data: SiteSettingsData | null | undefined, slug: string): string[] {
  const map = normalizeLandingCollages(data?.landingCollages);
  if (!(LANDING_COLLAGE_SLUGS as readonly string[]).includes(slug)) return [];
  return map[slug as LandingCollageSlug].filter((url) => url.length > 0);
}

export function normalizeMegaPromo(raw: unknown): MegaPromoByCategory {
  if (!raw || typeof raw !== "object") return {};
  const out: MegaPromoByCategory = {};
  for (const [cat, slots] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(slots)) continue;
    const cleaned = slots
      .filter((s): s is MegaPromoImageSlot => Boolean(s && typeof s === "object" && typeof (s as MegaPromoImageSlot).imageUrl === "string"))
      .map((s) => ({
        imageUrl: String(s.imageUrl).trim(),
        ...(s.href?.trim() ? { href: s.href.trim() } : {}),
        ...(s.label?.trim() ? { label: s.label.trim() } : {}),
      }))
      .filter((s) => s.imageUrl.length > 0)
      .slice(0, 4);
    if (cleaned.length) out[cat] = cleaned;
  }
  return out;
}

export function megaPromoForCategory(data: SiteSettingsData | null | undefined, categoryName: string): MegaPromoImageSlot[] {
  const map = normalizeMegaPromo(data?.megaPromo);
  const exact = map[categoryName];
  if (exact?.length) return exact;
  const key = Object.keys(map).find((k) => k.toLowerCase() === categoryName.toLowerCase());
  return key ? map[key]! : [];
}
