import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeMegaPromo, type SiteSettingsData } from "@/lib/site-settings";

const SETTINGS_ID = 1;

export async function getSiteSettingsData(): Promise<SiteSettingsData> {
  const row = await prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row?.data || typeof row.data !== "object") return {};
  return row.data as SiteSettingsData;
}

export async function getMegaPromoMap() {
  const data = await getSiteSettingsData();
  return normalizeMegaPromo(data.megaPromo);
}

export async function mergeSiteSettingsData(patch: Partial<SiteSettingsData>): Promise<SiteSettingsData> {
  const current = await getSiteSettingsData();
  const next: SiteSettingsData = { ...current, ...patch };
  if (patch.megaPromo !== undefined) {
    next.megaPromo = normalizeMegaPromo(patch.megaPromo);
  }
  await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, data: next as Prisma.InputJsonValue },
    update: { data: next as Prisma.InputJsonValue },
  });
  return next;
}
