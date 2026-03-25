import type { AdminCategoryTree, AdminSubcategoryRow } from "@/lib/types/admin-category";

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

export async function fetchAdminCategories(): Promise<AdminCategoryTree[]> {
  const res = await fetch("/api/admin/categories", fetchOpts);
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { categories?: unknown };
  if (!Array.isArray(data.categories)) return [];
  return data.categories as AdminCategoryTree[];
}

export async function createAdminCategory(body: Record<string, unknown>): Promise<AdminCategoryTree> {
  const res = await fetch("/api/admin/categories", {
    ...fetchOpts,
    method: "POST",
    headers: { ...fetchOpts.headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { category: AdminCategoryTree };
  return data.category;
}

export async function updateAdminCategory(
  id: string,
  body: Record<string, unknown>
): Promise<AdminCategoryTree> {
  const res = await fetch(`/api/admin/categories/${id}`, {
    ...fetchOpts,
    method: "PUT",
    headers: { ...fetchOpts.headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { category: AdminCategoryTree };
  return data.category;
}

export async function deleteAdminCategory(id: string): Promise<void> {
  const res = await fetch(`/api/admin/categories/${id}`, { ...fetchOpts, method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function createAdminSubcategory(
  categoryId: string,
  body: Record<string, unknown>
): Promise<AdminSubcategoryRow> {
  const res = await fetch(`/api/admin/categories/${categoryId}/subcategories`, {
    ...fetchOpts,
    method: "POST",
    headers: { ...fetchOpts.headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { subcategory: AdminSubcategoryRow };
  return data.subcategory;
}

export async function updateAdminSubcategory(
  id: string,
  body: Record<string, unknown>
): Promise<AdminSubcategoryRow> {
  const res = await fetch(`/api/admin/subcategories/${id}`, {
    ...fetchOpts,
    method: "PUT",
    headers: { ...fetchOpts.headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { subcategory: AdminSubcategoryRow };
  return data.subcategory;
}

export async function deleteAdminSubcategory(id: string): Promise<void> {
  const res = await fetch(`/api/admin/subcategories/${id}`, { ...fetchOpts, method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}
