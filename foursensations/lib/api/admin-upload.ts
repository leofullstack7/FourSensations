import type { AdminProduct } from "@/lib/types/admin";
import { adminFetch } from "@/lib/api/admin-fetch";

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

export type AdminUploadResult = {
  url: string;
  optimized: boolean;
  contentType: string;
  beforeBytes: number;
  afterBytes: number;
  width?: number;
  height?: number;
};

/** Sube un archivo a Bunny/storage vía API admin; el servidor lo optimiza a WebP. */
export async function uploadAdminImage(file: File): Promise<AdminUploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await adminFetch("/api/admin/upload", {
    method: "POST",
    body: fd,
    credentials: "include",
    noRetry: true,
    timeoutMs: 120_000,
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as Partial<AdminUploadResult> & { url?: string };
  if (!data.url) throw new Error("Respuesta sin URL");
  return {
    url: data.url,
    optimized: Boolean(data.optimized),
    contentType: data.contentType || "image/webp",
    beforeBytes: typeof data.beforeBytes === "number" ? data.beforeBytes : 0,
    afterBytes: typeof data.afterBytes === "number" ? data.afterBytes : 0,
    width: data.width,
    height: data.height,
  };
}

/** Sube un archivo a Bunny vía API admin (requiere sesión). */
export async function uploadAdminProductImage(file: File): Promise<string> {
  const result = await uploadAdminImage(file);
  return result.url;
}

export async function setProductCoverImages(
  productId: string,
  primaryUrl: string | null,
  hoverUrl: string | null,
): Promise<AdminProduct> {
  const res = await adminFetch(`/api/admin/products/${productId}/covers`, {
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
  const res = await adminFetch(`/api/admin/product-photos?sku=${encodeURIComponent(sku)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { urls?: string[] };
  return data.urls ?? [];
}

export async function addProductGalleryImage(productId: string, url: string): Promise<AdminProduct> {
  const res = await adminFetch(`/api/admin/products/${productId}/images`, {
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
  const res = await adminFetch(`/api/admin/products/${productId}/images/${imageId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { product: AdminProduct };
  return data.product;
}
