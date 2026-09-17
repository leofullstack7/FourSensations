import type { AdminProductFamily } from "@/lib/types/admin-family";

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

const fetchOpts: RequestInit = {
  cache: "no-store",
  credentials: "include",
  headers: { Accept: "application/json" },
};

export async function fetchAdminFamilies(): Promise<AdminProductFamily[]> {
  const res = await fetch("/api/admin/families", fetchOpts);
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { families?: unknown };
  return Array.isArray(data.families) ? (data.families as AdminProductFamily[]) : [];
}

export async function createAdminFamily(name: string): Promise<AdminProductFamily> {
  const res = await fetch("/api/admin/families", {
    ...fetchOpts,
    method: "POST",
    headers: { ...fetchOpts.headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { family: AdminProductFamily };
  return data.family;
}

export async function updateAdminFamily(
  id: string,
  name: string
): Promise<AdminProductFamily> {
  const res = await fetch(`/api/admin/families/${id}`, {
    ...fetchOpts,
    method: "PUT",
    headers: { ...fetchOpts.headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { family: AdminProductFamily };
  return data.family;
}

export async function deleteAdminFamily(id: string): Promise<void> {
  const res = await fetch(`/api/admin/families/${id}`, { ...fetchOpts, method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}
