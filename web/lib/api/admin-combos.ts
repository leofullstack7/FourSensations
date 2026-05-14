export type AdminComboCatalogProduct = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  subcategory: string;
  tags: string[];
  price: number;
  imageUrl: string | null;
  emoji: string | null;
  description: string;
  stock: number;
  soldQty: number;
};

export type AdminComboCatalogResponse = {
  products: AdminComboCatalogProduct[];
  filterOptions: {
    brands: string[];
    categories: string[];
    subcategories: string[];
    tags: string[];
  };
};

export type AdminComboLine = {
  id: string;
  quantity: number;
  sortOrder: number;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    emoji: string | null;
  };
};

export type AdminComboRow = {
  id: string;
  name: string;
  slug: string;
  comboPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  items: AdminComboLine[];
};

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export async function fetchAdminCombosCatalog(params: {
  q?: string;
  category?: string;
  subcategory?: string;
  tag?: string;
  brand?: string;
}): Promise<AdminComboCatalogResponse> {
  const sp = new URLSearchParams();
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.category?.trim()) sp.set("category", params.category.trim());
  if (params.subcategory?.trim()) sp.set("subcategory", params.subcategory.trim());
  if (params.tag?.trim()) sp.set("tag", params.tag.trim());
  if (params.brand?.trim()) sp.set("brand", params.brand.trim());
  const qs = sp.toString();
  const res = await fetch(`/api/admin/combos/catalog${qs ? `?${qs}` : ""}`, { headers: noStoreHeaders() });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Error al cargar catálogo");
  }
  return res.json() as Promise<AdminComboCatalogResponse>;
}

export async function fetchAdminCombos(): Promise<{ combos: AdminComboRow[] }> {
  const res = await fetch("/api/admin/combos", { headers: noStoreHeaders() });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? "Error al listar combos");
  }
  return res.json() as Promise<{ combos: AdminComboRow[] }>;
}

export async function postAdminCombo(body: {
  name: string;
  comboPrice: number;
  items: { productId: string; quantity?: number }[];
}): Promise<{ combo: AdminComboRow }> {
  const res = await fetch("/api/admin/combos", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...noStoreHeaders() },
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string; combo?: AdminComboRow };
  if (!res.ok) throw new Error(j.error ?? "No se pudo guardar el combo");
  if (!j.combo) throw new Error("Respuesta inválida del servidor");
  return { combo: j.combo };
}
