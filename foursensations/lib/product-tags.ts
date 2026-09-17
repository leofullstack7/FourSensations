import type { AdminCategoryTree } from "@/lib/types/admin-category";
import type { AdminProduct } from "@/lib/types/admin";

/** Etiquetas propias del producto (`Product.tags`) — búsqueda, IA, filtros. */
export function productOwnTags(product: Pick<AdminProduct, "tags">): string[] {
  return (product.tags ?? []).map((t) => t.trim()).filter(Boolean);
}

/** Etiqueta dorada del mega menú (columna `Subcategory.menuTag`). No es `Product.tags`. */
export function menuTagForProduct(
  product: Pick<AdminProduct, "category" | "subcategory">,
  tree: AdminCategoryTree[],
): string | null {
  if (!product.category?.trim()) return null;
  const cat = tree.find((c) => c.slug === product.category);
  if (!cat) return null;
  const sub = cat.subcategories.find((s) => s.name === product.subcategory);
  const tag = sub?.menuTag?.trim();
  return tag || null;
}

/** Quita etiquetas que coinciden con la del menú (no deben guardarse como tags de producto). */
export function filterOutMenuTags(tags: string[], menuTags: string[]): string[] {
  const blocked = new Set(menuTags.map((t) => t.trim().toLowerCase()).filter(Boolean));
  if (blocked.size === 0) return tags;
  return tags.filter((t) => !blocked.has(t.trim().toLowerCase()));
}

export function tagsToInputValue(tags: string[]): string {
  return productOwnTags({ tags }).join(", ");
}
