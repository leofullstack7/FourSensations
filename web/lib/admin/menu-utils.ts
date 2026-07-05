import type { MenuConfig } from "@/lib/types/admin";
import type { AdminCategoryTree } from "@/lib/types/admin-category";

export const MENU_TAG_CUSTOM_VALUE = "__custom__";

export type StorefrontMenuPreview = {
  config: MenuConfig;
  slugByCategoryName: Record<string, string>;
};

/** Misma lógica que `fetchStorefrontCategoryMenuFromDb` en la tienda. */
export function buildMenuConfigFromTree(tree: AdminCategoryTree[]): StorefrontMenuPreview {
  const sorted = [...tree].sort((a, b) => a.sortOrder - b.sortOrder);
  const config: MenuConfig = {};
  const slugByCategoryName: Record<string, string> = {};

  for (const c of sorted) {
    const subsRecord: Record<string, string[]> = {};
    const subs = [...c.subcategories].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const s of subs) {
      const group = (s.menuTag?.trim() || "General").trim();
      if (!subsRecord[group]) subsRecord[group] = [];
      subsRecord[group].push(s.name);
    }
    config[c.name] = {
      icon: c.icon ?? "📦",
      subs: subsRecord,
    };
    slugByCategoryName[c.name] = c.slug;
  }

  return { config, slugByCategoryName };
}

export function resolveMenuTagFromEditor(
  presetOptions: string[],
  selectValue: string,
  customValue: string
): string {
  if (presetOptions.length === 0) return customValue.trim();
  if (selectValue === MENU_TAG_CUSTOM_VALUE) return customValue.trim();
  return selectValue.trim();
}

/** Etiquetas de menú (columnas del mega menú) desde subcategorías en DB. */
export function menuTagOptionsFromTree(
  tree: AdminCategoryTree[],
  categorySlug: string,
  subcategoryName: string
): string[] {
  const cat = tree.find((c) => c.slug === categorySlug);
  if (!cat) return [];
  const norm = (mt: string | null) => (mt?.trim() ? mt.trim() : "General");
  if (subcategoryName.trim()) {
    const sub = cat.subcategories.find((s) => s.name === subcategoryName);
    if (sub) return [norm(sub.menuTag)];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of cat.subcategories) {
    const v = norm(s.menuTag);
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  out.sort((a, b) => a.localeCompare(b, "es"));
  return out;
}
