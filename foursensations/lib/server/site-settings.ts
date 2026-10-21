import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeProductFicha, normalizeProductFichaMap, type ProductFichaCopy } from "@/lib/product-ficha";
import {
  homeContentFromSettings,
  normalizeHomeContent,
  normalizeLandingCollages,
  normalizeMegaPromo,
  type SiteSettingsData,
} from "@/lib/site-settings";

const SETTINGS_ID = 1;

export async function getSiteSettingsData(): Promise<SiteSettingsData> {
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!row?.data || typeof row.data !== "object") return {};
    return row.data as SiteSettingsData;
  } catch (e) {
    // Neon caído/cuota: no tumbar la tienda; devolver vacío (defaults).
    console.warn("[site-settings] no se pudo leer SiteSettings:", e);
    return {};
  }
}

export async function getMegaPromoMap() {
  const data = await getSiteSettingsData();
  return normalizeMegaPromo(data.megaPromo);
}

export async function getHomeContentSettings() {
  const data = await getSiteSettingsData();
  return homeContentFromSettings(data);
}

export async function mergeSiteSettingsData(patch: Partial<SiteSettingsData>): Promise<SiteSettingsData> {
  const current = await getSiteSettingsData();
  const next: SiteSettingsData = { ...current, ...patch };
  if (patch.megaPromo !== undefined) {
    next.megaPromo = normalizeMegaPromo(patch.megaPromo);
  }
  if (patch.landingCollages !== undefined) {
    next.landingCollages = normalizeLandingCollages(patch.landingCollages);
  }
  if (patch.homeContent !== undefined) {
    next.homeContent = normalizeHomeContent(patch.homeContent);
  }
  if (patch.productFichas !== undefined) {
    next.productFichas = normalizeProductFichaMap(patch.productFichas);
  }
  await prisma.siteSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, data: next as Prisma.InputJsonValue },
    update: { data: next as Prisma.InputJsonValue },
  });
  return next;
}

export async function getProductFichaMap(): Promise<Record<string, ProductFichaCopy>> {
  const data = await getSiteSettingsData();
  return normalizeProductFichaMap(data.productFichas);
}

export async function getProductFicha(productId: string): Promise<ProductFichaCopy | null> {
  const map = await getProductFichaMap();
  return map[productId] ?? null;
}

export async function saveProductFicha(productId: string, raw: unknown): Promise<ProductFichaCopy | null> {
  const ficha = normalizeProductFicha(raw);
  const current = await getProductFichaMap();
  const next = { ...current };
  if (ficha) next[productId] = ficha;
  else delete next[productId];
  await mergeSiteSettingsData({ productFichas: next });
  return ficha;
}
