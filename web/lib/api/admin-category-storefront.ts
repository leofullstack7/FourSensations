import type { AdminCategoryStorefrontProductCard } from "@/app/api/admin/categories/[id]/storefront-order/route";

export type CategoryStorefrontOrderPayload = {
  category: { id: string; slug: string; name: string; icon: string | null };
  featuredIds: string[];
  slotCount: number;
  products: AdminCategoryStorefrontProductCard[];
};

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

export async function fetchCategoryStorefrontOrder(categoryId: string): Promise<CategoryStorefrontOrderPayload> {
  const res = await fetch(`/api/admin/categories/${categoryId}/storefront-order`, fetchOpts);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as CategoryStorefrontOrderPayload;
}

export async function saveCategoryStorefrontOrder(
  categoryId: string,
  productIds: string[],
): Promise<{ featuredIds: string[] }> {
  const res = await fetch(`/api/admin/categories/${categoryId}/storefront-order`, {
    ...fetchOpts,
    method: "PUT",
    headers: { ...fetchOpts.headers, "Content-Type": "application/json" },
    body: JSON.stringify({ productIds }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { featuredIds: string[] };
  return data;
}
