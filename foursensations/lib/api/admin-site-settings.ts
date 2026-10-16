import type { MegaPromoByCategory } from "@/lib/site-settings";
import { adminFetch } from "@/lib/api/admin-fetch";

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function fetchAdminMegaPromo(): Promise<MegaPromoByCategory> {
  const res = await adminFetch("/api/admin/site-settings", { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { megaPromo?: MegaPromoByCategory };
  return data.megaPromo ?? {};
}

export async function saveAdminMegaPromo(megaPromo: MegaPromoByCategory): Promise<MegaPromoByCategory> {
  const res = await adminFetch("/api/admin/site-settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ megaPromo }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { megaPromo?: MegaPromoByCategory };
  return data.megaPromo ?? {};
}
