import { revalidatePath } from "next/cache";
import { requireAdminApi } from "@/lib/server/require-admin-api";
import { noStoreJson } from "@/lib/server/no-store-json";
import { getSiteSettingsData, mergeSiteSettingsData } from "@/lib/server/site-settings";
import {
  homeContentFromSettings,
  normalizeHomeContent,
  normalizeLandingCollages,
  normalizeMegaPromo,
  type SiteSettingsData,
} from "@/lib/site-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function revalidatePublicContent() {
  revalidatePath("/");
  revalidatePath("/inicio");
  revalidatePath("/categoria/cuidado-capilar");
  revalidatePath("/categoria/cuidado-corporal");
  revalidatePath("/categoria/accesorios");
  revalidatePath("/categoria/kits");
}

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const data = await getSiteSettingsData();
  return noStoreJson({
    megaPromo: normalizeMegaPromo(data.megaPromo),
    landingCollages: normalizeLandingCollages(data.landingCollages),
    homeContent: homeContentFromSettings(data),
  });
}

export async function PUT(req: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return noStoreJson({ error: "JSON inválido" }, { status: 400 });
  }
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const patch: Partial<SiteSettingsData> = {};
  if ("megaPromo" in rec) {
    patch.megaPromo = normalizeMegaPromo(rec.megaPromo);
  }
  if ("landingCollages" in rec) {
    patch.landingCollages = normalizeLandingCollages(rec.landingCollages);
  }
  if ("homeContent" in rec) {
    patch.homeContent = normalizeHomeContent(rec.homeContent);
  }
  if (Object.keys(patch).length === 0) {
    return noStoreJson({ error: "Nada que actualizar" }, { status: 400 });
  }
  const data = await mergeSiteSettingsData(patch);
  revalidatePublicContent();
  return noStoreJson({
    megaPromo: normalizeMegaPromo(data.megaPromo),
    landingCollages: normalizeLandingCollages(data.landingCollages),
    homeContent: homeContentFromSettings(data),
  });
}
