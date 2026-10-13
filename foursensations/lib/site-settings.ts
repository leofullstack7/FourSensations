/** Formas públicas / admin del JSON `SiteSettings.data`. */

export type MegaPromoImageSlot = {
  imageUrl: string;
  href?: string;
  label?: string;
};

export type MegaPromoByCategory = Record<string, MegaPromoImageSlot[]>;

export type SiteSettingsData = {
  megaPromo?: MegaPromoByCategory;
  [key: string]: unknown;
};

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
