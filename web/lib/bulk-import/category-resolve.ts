import { normalizeKey } from "./normalize";

export type CategoryRow = {
  slug: string;
  name: string;
  subcategories: { slug: string; name: string }[];
};

const STOPWORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "e"]);

function normalizeTaxonomyText(input: string): string {
  const base = normalizeKey(input).replace(/-/g, " ");
  const tokens = base
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
  return tokens.join(" ");
}

function compactText(input: string): string {
  return normalizeTaxonomyText(input).replace(/\s+/g, "");
}

function tokenSimilarity(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter += 1;
  });
  return inter / Math.max(ta.size, tb.size);
}

/**
 * Resuelve texto de CSV a slug de categoría (por slug o nombre).
 */
export function resolveCategorySlug(input: string | null, tree: CategoryRow[]): string | null {
  if (!input?.trim()) return null;
  const key = normalizeTaxonomyText(input);
  const compactKey = compactText(input);
  for (const c of tree) {
    const slug = normalizeTaxonomyText(c.slug);
    const name = normalizeTaxonomyText(c.name);
    const compactSlug = compactText(c.slug);
    const compactName = compactText(c.name);
    if (
      slug === key ||
      name === key ||
      compactSlug === compactKey ||
      compactName === compactKey
    ) return c.slug;
  }
  for (const c of tree) {
    const slug = normalizeTaxonomyText(c.slug);
    const name = normalizeTaxonomyText(c.name);
    const compactSlug = compactText(c.slug);
    const compactName = compactText(c.name);
    if (
      slug.includes(key) ||
      key.includes(slug) ||
      name.includes(key) ||
      key.includes(name) ||
      compactSlug.includes(compactKey) ||
      compactKey.includes(compactSlug) ||
      compactName.includes(compactKey) ||
      compactKey.includes(compactName)
    ) return c.slug;
  }
  let best: { slug: string; score: number } | null = null;
  for (const c of tree) {
    const score = Math.max(
      tokenSimilarity(key, normalizeTaxonomyText(c.slug)),
      tokenSimilarity(key, normalizeTaxonomyText(c.name))
    );
    if (score >= 0.66 && (!best || score > best.score)) {
      best = { slug: c.slug, score };
    }
  }
  if (best) return best.slug;
  return null;
}

/**
 * Resuelve subcategoría dentro de una categoría ya elegida (por nombre o slug).
 */
export function resolveSubcategoryName(
  categorySlug: string,
  input: string | null,
  tree: CategoryRow[]
): string | null {
  if (!input?.trim()) return null;
  const cat = tree.find((c) => c.slug === categorySlug);
  if (!cat) return null;
  const key = normalizeTaxonomyText(input);
  const compactKey = compactText(input);
  for (const s of cat.subcategories) {
    const sSlug = normalizeTaxonomyText(s.slug);
    const sName = normalizeTaxonomyText(s.name);
    const compactSlug = compactText(s.slug);
    const compactName = compactText(s.name);
    if (
      sSlug === key ||
      sName === key ||
      compactSlug === compactKey ||
      compactName === compactKey ||
      sSlug.includes(key) ||
      key.includes(sSlug) ||
      sName.includes(key) ||
      key.includes(sName) ||
      compactSlug.includes(compactKey) ||
      compactKey.includes(compactSlug) ||
      compactName.includes(compactKey) ||
      compactKey.includes(compactName)
    ) return s.name;
  }
  let best: { name: string; score: number } | null = null;
  for (const s of cat.subcategories) {
    const score = Math.max(
      tokenSimilarity(key, normalizeTaxonomyText(s.slug)),
      tokenSimilarity(key, normalizeTaxonomyText(s.name))
    );
    if (score >= 0.66 && (!best || score > best.score)) {
      best = { name: s.name, score };
    }
  }
  if (best) return best.name;
  return null;
}

/**
 * Si no hay categoría explícita en CSV, intenta inferirla por subcategoría.
 */
export function resolveCategoryBySubcategory(
  subInput: string | null,
  tree: CategoryRow[]
): { categorySlug: string; subcategoryName: string } | null {
  if (!subInput?.trim()) return null;
  const key = normalizeTaxonomyText(subInput);
  const compactKey = compactText(subInput);
  const hits: { categorySlug: string; subcategoryName: string }[] = [];
  for (const c of tree) {
    for (const s of c.subcategories) {
      const sSlug = normalizeTaxonomyText(s.slug);
      const sName = normalizeTaxonomyText(s.name);
      const compactSlug = compactText(s.slug);
      const compactName = compactText(s.name);
      if (
        sSlug === key ||
        sName === key ||
        compactSlug === compactKey ||
        compactName === compactKey ||
        sSlug.includes(key) ||
        key.includes(sSlug) ||
        sName.includes(key) ||
        key.includes(sName) ||
        compactSlug.includes(compactKey) ||
        compactKey.includes(compactSlug) ||
        compactName.includes(compactKey) ||
        compactKey.includes(compactName)
      ) {
        hits.push({ categorySlug: c.slug, subcategoryName: s.name });
      }
    }
  }
  if (hits.length === 1) return hits[0]!;
  return null;
}

/**
 * Busca subcategoría en toda la taxonomía; útil cuando la categoría del CSV falla
 * o viene vacía. Solo aplica si hay coincidencia única.
 */
export function resolveSubcategoryGlobal(
  subInput: string | null,
  tree: CategoryRow[]
): { categorySlug: string; subcategoryName: string } | null {
  return resolveCategoryBySubcategory(subInput, tree);
}

export function firstSubcategoryName(cat: CategoryRow | undefined): string {
  if (!cat?.subcategories.length) return "General";
  return [...cat.subcategories].sort((a, b) => a.name.localeCompare(b.name))[0]!.name;
}
