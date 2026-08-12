"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { useStoreNavigation } from "@/components/store/StoreNavigationProvider";
import { TechAmbient } from "@/components/ui/TechAmbient";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { StoreProductCard } from "@/components/store/store-product-card";
import type { StoreProduct } from "@/lib/types/product";
import { formatBrandDisplayName } from "@/lib/brand-display";
import { getCategoryLandingCopy } from "@/lib/category-landing-theme";
import { getCategoryLandingBanner, getCategoryLandingBannerTone } from "@/lib/category-banners";
import {
  enrichStorefrontDisplayProducts,
  resolveStorefrontDisplayAfterFilter,
} from "@/lib/store/variant-groups";

export type SubcategoryRow = {
  name: string;
  menuTag: string | null;
};

type CategoryLandingClientProps = {
  categoryLabel: string;
  categorySlug: string;
  categoryIcon: string;
  subcategoriesFromDb: SubcategoryRow[];
  grupoLabels: string[];
  defaultGrupo: string;
  defaultSubcategory: string;
  defaultProductTag: string;
};

const CATEGORY_PAGE_SIZE = 24;
/** Si hay más de este total de SKUs, mostrar al inicio solo INITIAL_VISIBLE tarjetas. */
const TOTAL_SKU_THRESHOLD = 10;
const INITIAL_VISIBLE = 8;
const REVEAL_STEP = 8;
const MIN_NEW_CARDS_PER_CLICK = 8;
const MAX_FETCH_ROUNDS = 25;

function normalizeGroup(menuTag: string | null): string {
  return (menuTag?.trim() ? menuTag.trim() : "General") as string;
}

function subcategoryMatches(productSub: string, filterSub: string): boolean {
  return productSub.trim().toLowerCase() === filterSub.trim().toLowerCase();
}

function brandMatches(productBrand: string, selectedBrand: string): boolean {
  return productBrand.trim().toLowerCase() === selectedBrand.trim().toLowerCase();
}

function productMatchesCategoryFilters(
  p: StoreProduct,
  opts: {
    selectedGrupo: string;
    selectedSub: string;
    selectedBrand: string;
    selectedProductTag: string;
    subcategoriesFromDb: SubcategoryRow[];
  },
): boolean {
  const { selectedGrupo, selectedSub, selectedBrand, selectedProductTag, subcategoriesFromDb } = opts;
  if (selectedGrupo) {
    const allowed = new Set(
      subcategoriesFromDb.filter((s) => normalizeGroup(s.menuTag) === selectedGrupo).map((s) => s.name),
    );
    if (allowed.size > 0 && !Array.from(allowed).some((name) => subcategoryMatches(p.subcategory, name))) {
      return false;
    }
  }
  if (selectedSub && !subcategoryMatches(p.subcategory, selectedSub)) return false;
  if (selectedBrand && !brandMatches(p.brand, selectedBrand)) return false;
  if (
    selectedProductTag &&
    !(p.tags ?? []).some((t) => t.toLowerCase() === selectedProductTag.toLowerCase())
  ) {
    return false;
  }
  return true;
}

function computeDisplayCount(
  allProducts: StoreProduct[],
  filterOpts: {
    selectedGrupo: string;
    selectedSub: string;
    selectedBrand: string;
    selectedProductTag: string;
    subcategoriesFromDb: SubcategoryRow[];
  },
): number {
  const filtered = allProducts.filter((p) => productMatchesCategoryFilters(p, filterOpts));
  return enrichStorefrontDisplayProducts(
    resolveStorefrontDisplayAfterFilter(filtered, allProducts),
    allProducts,
  ).length;
}

function CategoryProductSkeleton() {
  return (
    <div className="products-grid category-landing-products" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="gb-skel-card" style={{ minHeight: 280 }}>
          <div className="gb-skel gb-skel-card-img" />
          <div className="gb-skel gb-skel-line gb-skel-line--med" style={{ marginTop: 12 }} />
          <div className="gb-skel gb-skel-line gb-skel-line--short" style={{ marginTop: 8 }} />
        </div>
      ))}
    </div>
  );
}

export function CategoryLandingClient({
  categoryLabel,
  categorySlug,
  categoryIcon,
  subcategoriesFromDb,
  grupoLabels,
  defaultGrupo,
  defaultSubcategory,
  defaultProductTag,
}: CategoryLandingClientProps) {
  const { openProductModal, addToCart, toggleFavorite, favorites, mergeCatalogProducts } = useStorefrontUi();
  const { categoryNavFilters } = useStoreNavigation();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [restSkip, setRestSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE);
  const loadingRef = useRef(false);

  const copy = useMemo(() => getCategoryLandingCopy(categoryLabel, categorySlug), [categoryLabel, categorySlug]);
  const [selectedGrupo, setSelectedGrupo] = useState(defaultGrupo);
  const [selectedSub, setSelectedSub] = useState(defaultSubcategory);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedProductTag, setSelectedProductTag] = useState(defaultProductTag);

  const [grupoChosen, setGrupoChosen] = useState(Boolean(defaultGrupo));
  const [subChosen, setSubChosen] = useState(Boolean(defaultSubcategory));
  const [brandChosen, setBrandChosen] = useState(false);
  const [filterHint, setFilterHint] = useState<string | null>(null);
  const [hintTarget, setHintTarget] = useState<"grupo" | "sub" | "brand" | null>(null);

  const filterOpts = useMemo(
    () => ({
      selectedGrupo,
      selectedSub,
      selectedBrand,
      selectedProductTag,
      subcategoriesFromDb,
    }),
    [selectedGrupo, selectedSub, selectedBrand, selectedProductTag, subcategoriesFromDb],
  );

  const fetchRawPage = useCallback(
    async (skip: number) => {
      const url = `/api/store/category/${encodeURIComponent(categorySlug)}/products?skip=${skip}&take=${CATEGORY_PAGE_SIZE}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar productos");
      const data = (await res.json()) as {
        products?: StoreProduct[];
        hasMore?: boolean;
        totalCount?: number;
      };
      return {
        batch: Array.isArray(data.products) ? data.products : [],
        hasMore: Boolean(data.hasMore),
        totalCount: typeof data.totalCount === "number" ? data.totalCount : null,
      };
    },
    [categorySlug],
  );

  const mergeLocal = useCallback((prev: StoreProduct[], batch: StoreProduct[]) => {
    const map = new Map(prev.map((p) => [p.id, p]));
    for (const p of batch) map.set(p.id, p);
    return Array.from(map.values());
  }, []);

  const fillUntilDisplayCards = useCallback(
    async (opts: {
      startProducts: StoreProduct[];
      startSkip: number;
      startHasMore: boolean;
      startTags: string[];
      minDisplay: number;
      minNewCards: number;
      displayBefore: number;
    }) => {
      let localProducts = opts.startProducts;
      let skip = opts.startSkip;
      let more = opts.startHasMore;
      let tags = opts.startTags;
      let total: number | null = null;
      let rounds = 0;

      while (more && rounds < MAX_FETCH_ROUNDS) {
        const displayNow = computeDisplayCount(localProducts, filterOpts);
        const gained = displayNow - opts.displayBefore;
        if (displayNow >= opts.minDisplay && gained >= opts.minNewCards) break;

        const page = await fetchRawPage(skip);
        if (page.totalCount != null) total = page.totalCount;
        if (page.batch.length === 0) {
          more = false;
          break;
        }
        localProducts = mergeLocal(localProducts, page.batch);
        mergeCatalogProducts(page.batch);
        const tagSet = new Set(tags);
        for (const p of page.batch) {
          for (const tg of p.tags ?? []) tagSet.add(tg);
        }
        tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b, "es"));
        skip += page.batch.length;
        more = page.hasMore;
        rounds += 1;
      }

      return { products: localProducts, skip, hasMore: more, tags, total };
    },
    [fetchRawPage, filterOpts, mergeCatalogProducts, mergeLocal],
  );

  useEffect(() => {
    let cancelled = false;
    setProducts([]);
    setRestSkip(0);
    setHasMore(true);
    setTotalProductCount(0);
    setAllTags([]);
    setVisibleLimit(INITIAL_VISIBLE);
    setCatalogLoading(true);
    loadingRef.current = true;

    void (async () => {
      try {
        const first = await fetchRawPage(0);
        if (cancelled) return;
        if (first.totalCount != null) setTotalProductCount(first.totalCount);
        let local = mergeLocal([], first.batch);
        mergeCatalogProducts(first.batch);
        let skip = first.batch.length;
        let more = first.hasMore;
        let tags: string[] = [];
        {
          const tagSet = new Set<string>();
          for (const p of first.batch) for (const tg of p.tags ?? []) tagSet.add(tg);
          tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b, "es"));
        }

        const total = first.totalCount ?? 0;
        if (total > TOTAL_SKU_THRESHOLD && more) {
          const filled = await fillUntilDisplayCards({
            startProducts: local,
            startSkip: skip,
            startHasMore: more,
            startTags: tags,
            minDisplay: INITIAL_VISIBLE,
            minNewCards: 0,
            displayBefore: 0,
          });
          if (cancelled) return;
          local = filled.products;
          skip = filled.skip;
          more = filled.hasMore;
          tags = filled.tags;
          if (filled.total != null) setTotalProductCount(filled.total);
        }

        if (cancelled) return;
        setProducts(local);
        setRestSkip(skip);
        setHasMore(more);
        setAllTags(tags);
      } catch {
        if (!cancelled) setHasMore(false);
      } finally {
        loadingRef.current = false;
        if (!cancelled) setCatalogLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar categoría
  }, [categorySlug]);

  const loadMoreCategory = useCallback(() => {
    if (!hasMore || catalogLoading || loadingRef.current) return Promise.resolve();
    setCatalogLoading(true);
    loadingRef.current = true;
    const displayBefore = computeDisplayCount(products, filterOpts);
    return (async () => {
      try {
        const filled = await fillUntilDisplayCards({
          startProducts: products,
          startSkip: restSkip,
          startHasMore: hasMore,
          startTags: allTags,
          minDisplay: displayBefore + 1,
          minNewCards: MIN_NEW_CARDS_PER_CLICK,
          displayBefore,
        });
        setProducts(filled.products);
        setRestSkip(filled.skip);
        setHasMore(filled.hasMore);
        setAllTags(filled.tags);
        if (filled.total != null) setTotalProductCount(filled.total);
      } catch {
        setHasMore(false);
      } finally {
        loadingRef.current = false;
        setCatalogLoading(false);
      }
    })();
  }, [hasMore, catalogLoading, products, filterOpts, restSkip, allTags, fillUntilDisplayCards]);

  useEffect(() => {
    setSelectedGrupo(defaultGrupo);
    setSelectedSub(defaultSubcategory);
    setSelectedProductTag(defaultProductTag);
    setSelectedBrand("");
    setGrupoChosen(Boolean(defaultGrupo || defaultSubcategory || defaultProductTag));
    setSubChosen(Boolean(defaultSubcategory || defaultProductTag));
    setBrandChosen(Boolean(defaultProductTag));
    setFilterHint(null);
    setHintTarget(null);
    setVisibleLimit(INITIAL_VISIBLE);
  }, [defaultGrupo, defaultSubcategory, defaultProductTag, categorySlug]);

  useEffect(() => {
    if (!categoryNavFilters) return;
    if (categoryNavFilters.grupo) {
      setSelectedGrupo(categoryNavFilters.grupo);
      setGrupoChosen(true);
    }
    if (categoryNavFilters.sub) {
      setSelectedSub(categoryNavFilters.sub);
      setSubChosen(true);
    }
    if (categoryNavFilters.tag) {
      setSelectedProductTag(categoryNavFilters.tag);
      setBrandChosen(true);
    }
  }, [categoryNavFilters]);

  useEffect(() => {
    setVisibleLimit(INITIAL_VISIBLE);
  }, [selectedGrupo, selectedSub, selectedBrand, selectedProductTag]);

  const subNamesInDb = useMemo(() => subcategoriesFromDb.map((s) => s.name), [subcategoriesFromDb]);

  const visibleSubNames = useMemo(() => {
    if (!selectedGrupo) return subNamesInDb;
    return subcategoriesFromDb
      .filter((s) => normalizeGroup(s.menuTag) === selectedGrupo)
      .map((s) => s.name);
  }, [subcategoriesFromDb, selectedGrupo, subNamesInDb]);

  const brandOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const p of products) {
      if (!productMatchesCategoryFilters(p, { ...filterOpts, selectedBrand: "", selectedProductTag: "" })) {
        continue;
      }
      const b = p.brand.trim();
      if (!b) continue;
      const key = b.toLowerCase();
      if (!set.has(key)) set.set(key, b);
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [products, filterOpts]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (
        !productMatchesCategoryFilters(p, {
          ...filterOpts,
          selectedProductTag: "",
        })
      ) {
        continue;
      }
      for (const t of p.tags ?? []) if (t.trim()) set.add(t.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products, filterOpts]);

  const filtered = useMemo(() => {
    return products.filter((p) => productMatchesCategoryFilters(p, filterOpts));
  }, [products, filterOpts]);

  const displayProducts = useMemo(
    () =>
      enrichStorefrontDisplayProducts(
        resolveStorefrontDisplayAfterFilter(filtered, products),
        products,
      ),
    [filtered, products],
  );

  const hasActiveFilters = Boolean(selectedGrupo || selectedSub || selectedBrand || selectedProductTag);

  const shouldCapVisible =
    totalProductCount > TOTAL_SKU_THRESHOLD || displayProducts.length > TOTAL_SKU_THRESHOLD;
  const shownProducts = shouldCapVisible
    ? displayProducts.slice(0, visibleLimit)
    : displayProducts;
  const hasHiddenLoaded = shownProducts.length < displayProducts.length;
  const showMoreButton = hasHiddenLoaded || (hasMore && shouldCapVisible);

  const onVerMas = () => {
    if (hasHiddenLoaded) {
      setVisibleLimit((n) => n + REVEAL_STEP);
      return;
    }
    void loadMoreCategory().then(() => setVisibleLimit((n) => n + REVEAL_STEP));
  };

  useEffect(() => {
    if (!hasActiveFilters) return;
    if (filtered.length > 0) return;
    if (!hasMore || catalogLoading || loadingRef.current) return;
    void loadMoreCategory();
  }, [hasActiveFilters, filtered.length, hasMore, catalogLoading, loadMoreCategory]);

  useEffect(() => {
    if (catalogLoading || loadingRef.current) return;
    if (!hasMore) return;
    if (totalProductCount <= TOTAL_SKU_THRESHOLD) return;
    if (displayProducts.length >= INITIAL_VISIBLE) return;
    void loadMoreCategory();
  }, [catalogLoading, hasMore, totalProductCount, displayProducts.length, loadMoreCategory]);

  const flashHint = (target: "grupo" | "sub" | "brand", message: string) => {
    setHintTarget(target);
    setFilterHint(message);
  };

  const pickGrupo = (g: string) => {
    setGrupoChosen(true);
    setSelectedGrupo(g);
    setSelectedSub("");
    setSelectedBrand("");
    setSelectedProductTag("");
    setSubChosen(false);
    setBrandChosen(false);
    setFilterHint(null);
    setHintTarget(null);
  };

  const pickSub = (s: string) => {
    if (!grupoChosen) {
      flashHint("grupo", "Primero selecciona un grupo del menú.");
      return;
    }
    setSubChosen(true);
    setSelectedSub(s);
    setSelectedBrand("");
    setSelectedProductTag("");
    setBrandChosen(false);
    setFilterHint(null);
    setHintTarget(null);
  };

  const pickBrand = (b: string) => {
    if (!grupoChosen) {
      flashHint("grupo", "Primero selecciona un grupo del menú.");
      return;
    }
    if (!subChosen) {
      flashHint("sub", "Primero selecciona una subcategoría.");
      return;
    }
    setBrandChosen(true);
    setSelectedBrand(b);
    setSelectedProductTag("");
    setFilterHint(null);
    setHintTarget(null);
  };

  const pickTag = (t: string) => {
    if (!grupoChosen) {
      flashHint("grupo", "Primero selecciona un grupo del menú.");
      return;
    }
    if (!subChosen) {
      flashHint("sub", "Primero selecciona una subcategoría.");
      return;
    }
    if (!brandChosen) {
      flashHint("brand", "Primero selecciona una marca.");
      return;
    }
    setSelectedProductTag(t);
    setFilterHint(null);
    setHintTarget(null);
  };

  useReveal();

  const showInitialSkeleton = catalogLoading && products.length === 0;
  const bannerSrc = getCategoryLandingBanner(categorySlug);
  const bannerTone = getCategoryLandingBannerTone(categorySlug);

  const heroCopy = (
    <div className="category-landing-hero-copy">
      <div className="gb-tech-chip">
        <span className="gb-tech-live-dot" style={{ width: 6, height: 6 }} aria-hidden />
        Catálogo inteligente
      </div>
      <div className="category-landing-eyebrow">Colección {categoryLabel}</div>
      <h1 className="category-landing-title">{copy.headline}</h1>
      <p className="category-landing-subtitle">{copy.subtitle}</p>
      <div className="category-landing-stats">
        <span className="category-landing-stat">
          ◈ {catalogLoading && totalProductCount === 0 ? "…" : totalProductCount} productos
        </span>
        <span className="category-landing-stat">⬡ {subcategoriesFromDb.length} subcategorías</span>
        <span className="category-landing-stat">✦ Filtros en vivo</span>
      </div>
      <div className="category-landing-cta-row">
        <Link href="/" className="btn btn-outline btn-sm category-landing-cta-back">
          {copy.ctaBack}
        </Link>
        <button
          type="button"
          className="btn btn-primary btn-sm category-landing-cta-primary"
          onClick={() => {
            setSelectedGrupo("");
            setSelectedSub("");
            setSelectedBrand("");
            setSelectedProductTag("");
            setGrupoChosen(false);
            setSubChosen(false);
            setBrandChosen(false);
            setFilterHint(null);
          }}
        >
          {copy.ctaExplore}
        </button>
      </div>
    </div>
  );

  return (
    <main className="category-landing-page">
      <section
        className={`category-landing-hero${bannerSrc ? ` category-landing-hero--has-banner category-landing-hero--banner-${bannerTone ?? "dark"}` : " section-pad"}`}
        data-landing-slug={categorySlug}
        aria-label={`Categoría ${categoryLabel}`}
      >
        {bannerSrc ? (
          <div className="category-landing-hero-stage">
            <img src={bannerSrc} alt="" className="category-landing-hero-banner" decoding="async" />
            <div className="category-landing-hero-inner category-landing-hero-inner--banner">{heroCopy}</div>
          </div>
        ) : (
          <>
            <TechAmbient variant="page" />
            <div className="category-landing-hero-glow" aria-hidden />
            <div className="container category-landing-hero-inner">
              <div className="category-landing-hero-visual" aria-hidden>
                <span className="category-landing-icon">{categoryIcon}</span>
              </div>
              {heroCopy}
            </div>
          </>
        )}
      </section>

      <section className="section-pad reveal" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="category-filter-panel">
            <div className="category-filter-title">Filtrar productos</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
              Elige en orden: grupo → subcategoría → marca → etiqueta.
            </p>
            <div className="category-filter-grid">
              <div className={hintTarget === "grupo" ? "category-filter-step is-hint" : "category-filter-step"}>
                <div className="category-filter-label">1. Grupo del menú</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${grupoChosen && selectedGrupo === "" ? " active" : ""}`}
                    onClick={() => pickGrupo("")}
                  >
                    Todos
                  </button>
                  {grupoLabels.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`category-filter-chip${selectedGrupo === g ? " active" : ""}`}
                      onClick={() => pickGrupo(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`category-filter-step${!grupoChosen ? " is-locked" : ""}${
                  hintTarget === "sub" ? " is-hint" : ""
                }`}
              >
                <div className="category-filter-label">2. Subcategorías</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${subChosen && selectedSub === "" ? " active" : ""}`}
                    onClick={() => pickSub("")}
                  >
                    Todas
                  </button>
                  {visibleSubNames.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`category-filter-chip${selectedSub === s ? " active" : ""}`}
                      onClick={() => pickSub(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`category-filter-step${!subChosen ? " is-locked" : ""}${
                  hintTarget === "brand" ? " is-hint" : ""
                }`}
              >
                <div className="category-filter-label">3. Familias / marcas</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${brandChosen && selectedBrand === "" ? " active" : ""}`}
                    onClick={() => pickBrand("")}
                  >
                    Todas
                  </button>
                  {brandOptions.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`category-filter-chip${brandMatches(selectedBrand, b) ? " active" : ""}`}
                      onClick={() => pickBrand(b)}
                    >
                      {formatBrandDisplayName(b)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`category-filter-step${!brandChosen ? " is-locked" : ""}`}>
                <div className="category-filter-label">4. Etiquetas de producto</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${selectedProductTag === "" && brandChosen ? " active" : ""}`}
                    onClick={() => pickTag("")}
                  >
                    Todas
                  </button>
                  {tagOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`category-filter-chip${selectedProductTag === t ? " active" : ""}`}
                      onClick={() => pickTag(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {filterHint ? (
              <p className="category-filter-hint" role="status">
                {filterHint}
              </p>
            ) : null}
          </div>

          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "14px 0 12px" }}>
            {showInitialSkeleton
              ? "Cargando productos…"
              : hasActiveFilters
                ? `${filtered.length} producto(s) con filtros activos · mostrando ${shownProducts.length}`
                : `Mostrando ${shownProducts.length} de ${totalProductCount} en ${categoryLabel}`}
            {catalogLoading && products.length > 0 ? " · cargando más…" : ""}
          </p>

          {subcategoriesFromDb.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--dusty-rose)", marginBottom: 16 }}>
              No hay subcategorías registradas en la base de datos para esta categoría. Agrégalas en el panel
              administrativo.
            </p>
          )}

          {showInitialSkeleton ? (
            <CategoryProductSkeleton />
          ) : filtered.length === 0 ? (
            <div className="admin-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>
              {catalogLoading || (hasActiveFilters && hasMore) ? (
                <>Buscando productos con estos filtros…</>
              ) : (
                <>No hay productos para estos filtros.</>
              )}
            </div>
          ) : (
            <>
              <div className="products-grid category-landing-products">
                {shownProducts.map((p, i) => (
                  <StoreProductCard
                    key={`${categorySlug}-${p.id}`}
                    product={p}
                    isFav={favorites.includes(p.id)}
                    onOpen={openProductModal}
                    onToggleFav={toggleFavorite}
                    onAddCart={addToCart}
                    imagePriority={i < 6}
                  />
                ))}
              </div>
              {showMoreButton ? (
                <div style={{ display: "flex", justifyContent: "center", margin: "28px 0 8px" }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={onVerMas}
                    disabled={catalogLoading}
                  >
                    {catalogLoading ? "Cargando productos…" : "Ver más productos"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
