import type { AdminProduct } from "@/lib/types/admin";

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Sube un archivo a Bunny vía API admin (requiere sesión). */
export async function uploadAdminProductImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("Respuesta sin URL");
  return data.url;
}

export async function setProductCoverImages(
  productId: string,
  primaryUrl: string | null,
  hoverUrl: string | null,
): Promise<AdminProduct> {
  const res = await fetch(`/api/admin/products/${productId}/covers`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ primaryUrl, hoverUrl }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { product: AdminProduct };
  return data.product;
}

export async function fetchProductSkuPhotos(sku: string): Promise<string[]> {
  const res = await fetch(`/api/admin/product-photos?sku=${encodeURIComponent(sku)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { urls?: string[] };
  return data.urls ?? [];
}

export async function addProductGalleryImage(productId: string, url: string): Promise<AdminProduct> {
  const res = await fetch(`/api/admin/products/${productId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { product: AdminProduct };
  return data.product;
}

export async function removeProductGalleryImage(
  productId: string,
  imageId: string
): Promise<AdminProduct> {
  const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { product: AdminProduct };
  return data.product;
}
