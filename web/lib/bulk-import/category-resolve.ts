import { normalizeKey } from "./normalize";

/** Clave estable para parejas (categoría CSV, subcategoría CSV) y overrides de reubicación. */
export function taxonomyPairKey(
  csvCategory: string | null | undefined,
  csvSubcategory: string | null | undefined
): string {
  return `${normalizeKey(csvCategory ?? "")}|||${normalizeKey(csvSubcategory ?? "")}`;
}

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

/** Todas las coincidencias exactas (mismo criterio que `resolveCategoryBySubcategory`). */
export function findAllExactGlobalSubcategoryMatches(
  subInput: string | null,
  tree: CategoryRow[]
): { categorySlug: string; subcategoryName: string }[] {
  if (!subInput?.trim()) return [];
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
  return hits;
}

function subMatchScore(subInput: string, s: { slug: string; name: string }): number {
  const key = normalizeTaxonomyText(subInput);
  const compactKey = compactText(subInput);
  const sSlug = normalizeTaxonomyText(s.slug);
  const sName = normalizeTaxonomyText(s.name);
  const compactSlug = compactText(s.slug);
  const compactName = compactText(s.name);
  if (sSlug === key || sName === key || compactSlug === compactKey || compactName === compactKey) return 1;
  if (
    sSlug.includes(key) ||
    key.includes(sSlug) ||
    sName.includes(key) ||
    key.includes(sName) ||
    compactSlug.includes(compactKey) ||
    compactKey.includes(compactSlug) ||
    compactName.includes(compactKey) ||
    compactKey.includes(compactName)
  )
    return 0.88;
  return Math.max(
    tokenSimilarity(key, sSlug),
    tokenSimilarity(key, sName),
    tokenSimilarity(normalizeTaxonomyText(subInput), normalizeTaxonomyText(s.name))
  );
}

/**
 * Si no hay coincidencia exacta única, elige la mejor subcategoría global por similitud
 * (umbral + margen respecto a la segunda) para evitar ambigüedad.
 */
export function findUniqueGlobalSubcategoryFuzzyMatch(
  subInput: string | null,
  tree: CategoryRow[],
  opts?: { minScore?: number; minGap?: number }
): { categorySlug: string; subcategoryName: string; categoryName: string } | null {
  if (!subInput?.trim()) return null;
  const minScore = opts?.minScore ?? 0.58;
  const minGap = opts?.minGap ?? 0.1;
  const candidates: { categorySlug: string; subcategoryName: string; categoryName: string; score: number }[] = [];
  for (const c of tree) {
    for (const s of c.subcategories) {
      const score = subMatchScore(subInput, s);
      if (score >= minScore) {
        candidates.push({
          categorySlug: c.slug,
          categoryName: c.name,
          subcategoryName: s.name,
          score,
        });
      }
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || a.subcategoryName.localeCompare(b.subcategoryName));
  const [first, second] = candidates;
  if (!first) return null;
  if (candidates.length === 1) return first;
  if (!second || first.score - second.score >= minGap) return first;
  return null;
}

export type TaxonomyRehomeKind =
  | "category_column_looks_like_subcategory"
  | "subcategory_better_in_other_category";

/**
 * Propone una categoría/subcategoría ya registradas cuando el CSV parece confundir columnas
 * o el padre no coincide con donde existe la sub.
 */
export function computeTaxonomyRehomeSuggestion(params: {
  csvCategory: string | null;
  csvSubcategory: string | null;
  tree: CategoryRow[];
  /** Resolución actual del preview (sin overrides). */
  resolvedCategorySlug: string | null;
  resolvedSubcategoryName: string | null;
}): {
  kind: TaxonomyRehomeKind;
  suggestedCategorySlug: string;
  suggestedCategoryName: string;
  suggestedSubcategoryName: string;
} | null {
  const { csvCategory, csvSubcategory, tree, resolvedCategorySlug, resolvedSubcategoryName } = params;
  const rawCat = csvCategory?.trim() ?? "";
  const rawSub = csvSubcategory?.trim() ?? "";

  if (resolvedCategorySlug && resolvedSubcategoryName) return null;

  const catResolved = rawCat ? resolveCategorySlug(rawCat, tree) : null;
  const subInResolvedCat =
    catResolved && rawSub ? resolveSubcategoryName(catResolved, csvSubcategory, tree) : null;

  // Columna categoría contiene el nombre de una sub (p. ej. "Labios" como categoría).
  if (!catResolved && rawCat) {
    const exact = findAllExactGlobalSubcategoryMatches(rawCat, tree);
    let pick: { categorySlug: string; subcategoryName: string; categoryName: string } | null = null;
    if (exact.length === 1) {
      const c = tree.find((x) => x.slug === exact[0]!.categorySlug);
      pick = { ...exact[0]!, categoryName: c?.name ?? exact[0]!.categorySlug };
    } else if (exact.length === 0) {
      const fuzzy = findUniqueGlobalSubcategoryFuzzyMatch(rawCat, tree);
      if (fuzzy) pick = fuzzy;
    }
    if (pick) {
      let subName = pick.subcategoryName;
      if (rawSub) {
        const sub2 = resolveSubcategoryName(pick.categorySlug, csvSubcategory, tree);
        if (sub2) subName = sub2;
      }
      if (
        resolvedCategorySlug === pick.categorySlug &&
        resolvedSubcategoryName === subName
      ) {
        return null;
      }
      return {
        kind: "category_column_looks_like_subcategory",
        suggestedCategorySlug: pick.categorySlug,
        suggestedCategoryName: pick.categoryName,
        suggestedSubcategoryName: subName,
      };
    }
  }

  // Categoría CSV válida pero la sub encaja mejor en otra categoría.
  if (catResolved && rawSub && !subInResolvedCat) {
    const exact = findAllExactGlobalSubcategoryMatches(rawSub, tree);
    let globalHit: { categorySlug: string; subcategoryName: string; categoryName: string } | null = null;
    if (exact.length === 1) {
      const c = tree.find((x) => x.slug === exact[0]!.categorySlug);
      globalHit = { ...exact[0]!, categoryName: c?.name ?? exact[0]!.categorySlug };
    } else if (exact.length === 0) {
      const fuzzy = findUniqueGlobalSubcategoryFuzzyMatch(rawSub, tree);
      if (fuzzy) globalHit = fuzzy;
    }
    if (globalHit && globalHit.categorySlug !== catResolved) {
      if (
        resolvedCategorySlug === globalHit.categorySlug &&
        resolvedSubcategoryName === globalHit.subcategoryName
      ) {
        return null;
      }
      return {
        kind: "subcategory_better_in_other_category",
        suggestedCategorySlug: globalHit.categorySlug,
        suggestedCategoryName: globalHit.categoryName,
        suggestedSubcategoryName: globalHit.subcategoryName,
      };
    }
  }

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
