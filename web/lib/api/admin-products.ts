import type { AdminProduct } from "@/lib/types/admin";
import { BULK_DELETE_ALL_CONFIRM_PHRASE } from "@/lib/validation/admin-product";

export { BULK_DELETE_ALL_CONFIRM_PHRASE };

type ApiErrorBody = { error: string; details?: unknown; hint?: string };

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as ApiErrorBody;
    const base = j.error || res.statusText;
    if (j.hint) return `${base} — ${j.hint}`;
    return base;
  } catch {
    return res.statusText;
  }
}

const fetchOpts = { credentials: "include" as const, headers: { Accept: "application/json" } };

function normalizeAdminProduct(p: AdminProduct): AdminProduct {
  return {
    ...p,
    featuredInHome: p.featuredInHome === true,
    tags: Array.isArray(p.tags) ? p.tags.filter(Boolean) : [],
    images: Array.isArray(p.images) ? p.images : [],
  };
}

export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const res = await fetch("/api/admin/products", {
    cache: "no-store",
    ...fetchOpts,
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { products?: unknown };
  const raw = data.products;
  if (!Array.isArray(raw)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[fetchAdminProducts] Respuesta sin array `products`:", data);
    }
    return [];
  }
  return (raw as AdminProduct[]).map((p) => normalizeAdminProduct(p));
}

export async function fetchAdminProduct(id: string): Promise<AdminProduct> {
  const res = await fetch(`/api/admin/products/${id}`, { cache: "no-store", ...fetchOpts });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { product: AdminProduct };
  return normalizeAdminProduct(data.product);
}

export async function createAdminProduct(body: Record<string, unknown>): Promise<AdminProduct> {
  const res = await fetch("/api/admin/products", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { product: AdminProduct };
  return normalizeAdminProduct(data.product);
}

export async function updateAdminProduct(
  id: string,
  body: Record<string, unknown>
): Promise<AdminProduct> {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { product: AdminProduct };
  return normalizeAdminProduct(data.product);
}

export async function deleteAdminProduct(id: string): Promise<void> {
  const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", credentials: "include" });
  if (!res.ok) throw new Error(await parseError(res));
}

export type AdminBulkDeleteProductsBody =
  | { mode: "ids"; ids: string[] }
  | { mode: "all"; confirmPhrase: typeof BULK_DELETE_ALL_CONFIRM_PHRASE };

export async function postAdminProductsBulkDelete(
  body: AdminBulkDeleteProductsBody
): Promise<{ deleted: number }> {
  const res = await fetch("/api/admin/products/bulk-delete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { deleted: number };
}

/** Asigna a cada producto la etiqueta de menú (`Subcategory.menuTag`) de su subcategoría. */
export async function postSyncProductTagsFromMenu(): Promise<{ updated: number; total: number }> {
  const res = await fetch("/api/admin/products/sync-menu-tags", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { updated: number; total: number };
}

export type AdminAiCompleteResult = {
  id: string;
  name: string;
  ok: boolean;
  filled: ("description" | "tags" | "emoji" | "badge")[];
  error?: string;
  product?: AdminProduct;
};

export async function postAdminProductsAiComplete(ids: string[]): Promise<{
  results: AdminAiCompleteResult[];
  summary: { total: number; succeeded: number; failed: number };
}> {
  const res = await fetch("/api/admin/products/ai-complete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as {
    results: AdminAiCompleteResult[];
    summary: { total: number; succeeded: number; failed: number };
  };
}

export async function postAdminProductsAiClear(ids: string[]): Promise<{ clearedProducts: number; clearedFields: number }> {
  const res = await fetch("/api/admin/products/ai-clear", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { clearedProducts: number; clearedFields: number };
}
