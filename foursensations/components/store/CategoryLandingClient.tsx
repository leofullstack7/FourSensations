"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useReveal } from "@/hooks/useReveal";
import { useStoreNavigation } from "@/components/store/StoreNavigationProvider";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { StoreProductCard } from "@/components/store/store-product-card";
import { ProductCollage } from "@/components/store/ProductCollage";
import { AccessoriesPhotoGallery } from "@/components/store/AccessoriesPhotoGallery";
import type { StoreProduct } from "@/lib/types/product";
import { getCategoryLandingCopy, HAIR_FILTER_GROUPS } from "@/lib/category-landing-theme";
import {
  enrichStorefrontDisplayProducts,
  resolveStorefrontDisplayAfterFilter,
} from "@/lib/store/variant-groups";
import { hairSubcategoryForProductName } from "@/lib/hair-subcategories";

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
  defaultProductTag: string;
  defaultLine?: string;
  collageUrls?: string[];
  galleryUrls?: string[];
};

const CATEGORY_PAGE_SIZE = 24;
const TOTAL_SKU_THRESHOLD = 10;
const INITIAL_VISIBLE = 8;
const REVEAL_STEP = 8;
const MIN_NEW_CARDS_PER_CLICK = 8;
const MAX_FETCH_ROUNDS = 25;

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeGroup(menuTag: string | null): string {
  return menuTag?.trim() ? menuTag.trim() : "General";
}

function subcategoryMatches(productSub: string, filterSub: string): boolean {
  return fold(productSub) === fold(filterSub);
}

function productMatchesHairGroup(p: StoreProduct, group: string, allowedLines: string[]): boolean {
  if (subcategoryMatches(p.subcategory, group)) return true;
  const fromName = hairSubcategoryForProductName(p.name);
  if (fromName && subcategoryMatches(fromName, group)) return true;
  return allowedLines.some(
    (name) => subcategoryMatches(p.subcategory, name) || fold(p.name) === fold(name),
  );
}

function productMatchesLine(p: StoreProduct, line: string): boolean {
  if (!line) return true;
  const target = fold(line);
  return fold(p.subcategory) === target || fold(p.name) === target || fold(p.name).includes(target);
}

type FilterOpts = {
  selectedGrupo: string;
  selectedLine: string;
  subcategoriesFromDb: SubcategoryRow[];
};

function productMatchesCategoryFilters(p: StoreProduct, opts: FilterOpts): boolean {
  const { selectedGrupo, selectedLine, subcategoriesFromDb } = opts;
  if (selectedGrupo) {
    const allowed = subcategoriesFromDb
      .filter((s) => normalizeGroup(s.menuTag) === selectedGrupo)
      .map((s) => s.name);
    if (!productMatchesHairGroup(p, selectedGrupo, allowed)) return false;
  }
  if (selectedLine && !productMatchesLine(p, selectedLine)) return false;
  return true;
}

function computeDisplayCount(allProducts: StoreProduct[], filterOpts: FilterOpts): number {
  const filtered = allProducts.filter((p) => productMatchesCategoryFilters(p, filterOpts));
  return enrichStorefrontDisplayProducts(
    resolveStorefrontDisplayAfterFilter(filtered, allProducts),
    allProducts,
  ).length;
}

function productHairBucket(p: StoreProduct): string {
  return hairSubcategoryForProductName(p.name) ?? (HAIR_FILTER_GROUPS as readonly string[]).find((g) => fold(g) === fold(p.subcategory)) ?? "Más líneas";
}

function CategoryProductSkeleton() {
  return (
    <div className="cat-mosaic" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="gb-skel-card cat-mosaic__cell" style={{ minHeight: 280 }}>
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
  categoryIcon: _categoryIcon,
  subcategoriesFromDb,
  grupoLabels,
  defaultGrupo,
  defaultProductTag,
  defaultLine = "",
  collageUrls = [],
  galleryUrls = [],
}: CategoryLandingClientProps) {
  const { openProductModal, addToCart, toggleFavorite, favorites, mergeCatalogProducts } = useStorefrontUi();
  const { categoryNavFilters } = useStoreNavigation();
  const router = useRouter();
  const pathname = usePathname();

  const hairMode = categorySlug === "cuidado-capilar";
  const accessoryMode = categorySlug === "accesorios";

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [restSkip, setRestSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE);
  const loadingRef = useRef(false);

  const copy = useMemo(() => getCategoryLandingCopy(categoryLabel, categorySlug), [categoryLabel, categorySlug]);
  const [selectedGrupo, setSelectedGrupo] = useState(defaultGrupo);
  const [selectedLine, setSelectedLine] = useState(defaultLine || defaultProductTag);

  const filterOpts = useMemo(
    () => ({ selectedGrupo, selectedLine, subcategoriesFromDb }),
    [selectedGrupo, selectedLine, subcategoriesFromDb],
  );

  const syncUrl = useCallback(
    (grupo: string, line: string) => {
      const params = new URLSearchParams();
      if (grupo) params.set("grupo", grupo);
      if (line) params.set("linea", line);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
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
      minDisplay: number;
      minNewCards: number;
      displayBefore: number;
    }) => {
      let localProducts = opts.startProducts;
      let skip = opts.startSkip;
      let more = opts.startHasMore;
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
        skip += page.batch.length;
        more = page.hasMore;
        rounds += 1;
      }

      return { products: localProducts, skip, hasMore: more, total };
    },
    [fetchRawPage, filterOpts, mergeCatalogProducts, mergeLocal],
  );

  useEffect(() => {
    let cancelled = false;
    setProducts([]);
    setRestSkip(0);
    setHasMore(true);
    setTotalProductCount(0);
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
        const total = first.totalCount ?? 0;
        if (total > TOTAL_SKU_THRESHOLD && more) {
          const filled = await fillUntilDisplayCards({
            startProducts: local,
            startSkip: skip,
            startHasMore: more,
            minDisplay: INITIAL_VISIBLE,
            minNewCards: 0,
            displayBefore: 0,
          });
          if (cancelled) return;
          local = filled.products;
          skip = filled.skip;
          more = filled.hasMore;
          if (filled.total != null) setTotalProductCount(filled.total);
        }
        if (cancelled) return;
        setProducts(local);
        setRestSkip(skip);
        setHasMore(more);
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
          minDisplay: displayBefore + 1,
          minNewCards: MIN_NEW_CARDS_PER_CLICK,
          displayBefore,
        });
        setProducts(filled.products);
        setRestSkip(filled.skip);
        setHasMore(filled.hasMore);
        if (filled.total != null) setTotalProductCount(filled.total);
      } catch {
        setHasMore(false);
      } finally {
        loadingRef.current = false;
        setCatalogLoading(false);
      }
    })();
  }, [hasMore, catalogLoading, products, filterOpts, restSkip, fillUntilDisplayCards]);

  useEffect(() => {
    setSelectedGrupo(defaultGrupo);
    setSelectedLine(defaultLine || defaultProductTag);
    setVisibleLimit(INITIAL_VISIBLE);
  }, [defaultGrupo, defaultProductTag, defaultLine, categorySlug]);

  useEffect(() => {
    if (!categoryNavFilters) return;
    if (categoryNavFilters.grupo) {
      setSelectedGrupo(categoryNavFilters.grupo);
    } else if (categoryNavFilters.sub && grupoLabels.some((g) => fold(g) === fold(categoryNavFilters.sub))) {
      setSelectedGrupo(categoryNavFilters.sub);
    }
    if (categoryNavFilters.sub && hairMode) {
      const asLine = subcategoriesFromDb.some((s) => fold(s.name) === fold(categoryNavFilters.sub));
      if (asLine) setSelectedLine(categoryNavFilters.sub);
    }
  }, [categoryNavFilters, grupoLabels, hairMode, subcategoriesFromDb]);

  useEffect(() => {
    setVisibleLimit(INITIAL_VISIBLE);
  }, [selectedGrupo, selectedLine]);

  const filtered = useMemo(
    () => products.filter((p) => productMatchesCategoryFilters(p, filterOpts)),
    [products, filterOpts],
  );

  const displayProducts = useMemo(
    () => enrichStorefrontDisplayProducts(resolveStorefrontDisplayAfterFilter(filtered, products), products),
    [filtered, products],
  );

  const hasActiveFilters = Boolean(selectedGrupo || selectedLine);
  const shouldCapVisible = totalProductCount > TOTAL_SKU_THRESHOLD || displayProducts.length > TOTAL_SKU_THRESHOLD;
  const shownProducts = shouldCapVisible ? displayProducts.slice(0, visibleLimit) : displayProducts;
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

  const visibleGroups = useMemo(() => {
    if (!hairMode) return [];
    const fromDb = HAIR_FILTER_GROUPS.filter((g) =>
      grupoLabels.some((x) => fold(x) === fold(g)) ||
      subcategoriesFromDb.some((s) => fold(normalizeGroup(s.menuTag)) === fold(g)),
    );
    return fromDb.length > 0 ? fromDb : grupoLabels;
  }, [hairMode, grupoLabels, subcategoriesFromDb]);

  const lineChips = useMemo(() => {
    if (accessoryMode) {
      return subcategoriesFromDb.map((s) => s.name).filter(Boolean);
    }
    if (!hairMode || !selectedGrupo) return [];
    return subcategoriesFromDb
      .filter((s) => fold(normalizeGroup(s.menuTag)) === fold(selectedGrupo))
      .map((s) => s.name);
  }, [accessoryMode, hairMode, selectedGrupo, subcategoriesFromDb]);

  const pickGrupo = (g: string) => {
    setSelectedGrupo(g);
    setSelectedLine("");
    syncUrl(g, "");
  };

  const pickLine = (line: string) => {
    setSelectedLine(line);
    syncUrl(selectedGrupo, line);
  };

  const groupedShown = useMemo(() => {
    if (accessoryMode || selectedGrupo || selectedLine) {
      return [{ title: selectedLine || selectedGrupo || null, items: shownProducts }];
    }
    if (!hairMode) {
      return [{ title: null, items: shownProducts }];
    }
    const buckets = new Map<string, StoreProduct[]>();
    for (const p of shownProducts) {
      const key = productHairBucket(p);
      const list = buckets.get(key) ?? [];
      list.push(p);
      buckets.set(key, list);
    }
    const ordered = [...HAIR_FILTER_GROUPS, "Más líneas"];
    return ordered
      .filter((title) => (buckets.get(title) ?? []).length > 0)
      .map((title) => ({ title, items: buckets.get(title)! }));
  }, [accessoryMode, hairMode, selectedGrupo, selectedLine, shownProducts]);

  useReveal();

  const showInitialSkeleton = catalogLoading && products.length === 0;

  return (
    <main className="category-landing-page">
      <section
        className={`fs-account-hero fs-cat-hero${accessoryMode && galleryUrls.length > 0 ? " fs-cat-hero--gallery" : ""}`}
        data-landing-slug={categorySlug}
        aria-label={`Categoría ${categoryLabel}`}
      >
        <div className="fs-account-hero__copy">
          <p className="fs-account-hero__eyebrow">{copy.eyebrow}</p>
          <h1>{copy.headline}</h1>
          <p>{copy.subtitle}</p>
          <p className="fs-cat-commercial">{copy.commercialLine}</p>
          <div className="category-landing-cta-row" style={{ marginTop: 18 }}>
            <Link href="/" className="btn btn-outline btn-sm">
              {copy.ctaBack}
            </Link>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                pickGrupo("");
                document.getElementById("cat-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {copy.ctaExplore}
            </button>
          </div>
        </div>
        {accessoryMode && galleryUrls.length > 0 ? (
          <AccessoriesPhotoGallery urls={galleryUrls} />
        ) : (
          <ProductCollage sources={collageUrls} />
        )}
      </section>

      {copy.benefits.length > 0 ? (
        <section className="fs-cat-benefits">
          <div className="container fs-cat-benefits__grid">
            {copy.benefits.map((b) => (
              <article key={b.title} className="fs-cat-benefit">
                <span aria-hidden>{b.icon}</span>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="section-pad reveal" id="cat-catalog" style={{ paddingTop: 8 }}>
        <div className="container">
          <div className="category-filter-panel">
            <div className="category-filter-title">Filtrar el catálogo</div>
            {hairMode ? (
              <p className="fs-cat-filter-lead">
                Elige una familia (Tratamientos, Shampoo y Acondicionador, Crecimiento, Detox, Finalizadores, Hair Mist, Puntas o Pre-Shampoo) y, si quieres,
                una línea concreta.
              </p>
            ) : accessoryMode ? (
              <p className="fs-cat-filter-lead">
                Accesorios en una sola colección. Filtra por tipo: diademas, gorros, cepillos, ligas o pinzas.
              </p>
            ) : (
              <p className="fs-cat-filter-lead">Encuentra lo que buscas dentro de {categoryLabel}.</p>
            )}

            {hairMode ? (
              <div className="category-filter-step">
                <div className="category-filter-label">Familia</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${selectedGrupo === "" ? " active" : ""}`}
                    onClick={() => pickGrupo("")}
                  >
                    Todas
                  </button>
                  {visibleGroups.map((g) => (
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
            ) : null}

            {lineChips.length > 0 ? (
              <div className="category-filter-step" style={{ marginTop: 16 }}>
                <div className="category-filter-label">{accessoryMode ? "Tipo" : "Línea"}</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${selectedLine === "" ? " active" : ""}`}
                    onClick={() => pickLine("")}
                  >
                    Todas
                  </button>
                  {lineChips.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className={`category-filter-chip${fold(selectedLine) === fold(name) ? " active" : ""}`}
                      onClick={() => pickLine(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <p className="fs-cat-count">
            {showInitialSkeleton
              ? "Cargando productos…"
              : hasActiveFilters
                ? `${displayProducts.length} producto(s) · mostrando ${shownProducts.length}`
                : `Mostrando ${shownProducts.length} de ${totalProductCount} en ${categoryLabel}`}
            {catalogLoading && products.length > 0 ? " · cargando más…" : ""}
          </p>

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
              {groupedShown.map((group) => (
                <div key={group.title ?? "all"} className="fs-cat-group">
                  {group.title ? <h2 className="fs-cat-group__title">{group.title}</h2> : null}
                  <div className={`cat-mosaic${accessoryMode ? " cat-mosaic--accessories" : ""}`}>
                    {group.items.map((p, i) => (
                      <div key={`${categorySlug}-${p.id}`} className="cat-mosaic__cell">
                        <StoreProductCard
                          product={p}
                          isFav={favorites.includes(p.id)}
                          onOpen={openProductModal}
                          onToggleFav={toggleFavorite}
                          onAddCart={addToCart}
                          imagePriority={i < 4}
                          compact
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {showMoreButton ? (
                <div style={{ display: "flex", justifyContent: "center", margin: "28px 0 8px" }}>
                  <button type="button" className="btn btn-outline" onClick={onVerMas} disabled={catalogLoading}>
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
