type ApiErrorBody = { error: string };

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as ApiErrorBody;
    return j.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function expireAdminProductDiscounts(): Promise<{ expired: number }> {
  const res = await fetch("/api/admin/products/discounts", {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return { expired: 0 };
  return (await res.json()) as { expired: number };
}

export async function postAdminProductDiscounts(body: {
  action: "apply" | "remove";
  ids: string[];
  percent?: number;
  endsAt?: string | null;
}): Promise<{ updated: number }> {
  const res = await fetch("/api/admin/products/discounts", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { updated: number };
}
