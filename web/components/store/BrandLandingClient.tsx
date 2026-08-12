"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { TechAmbient } from "@/components/ui/TechAmbient";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { StoreProductCard } from "@/components/store/store-product-card";
import type { StoreProduct } from "@/lib/types/product";
import { getBrandLandingCopy } from "@/lib/brand-display";
import { getCategoryLabel } from "@/lib/category-labels";
import {
  enrichStorefrontDisplayProducts,
  resolveStorefrontDisplayAfterFilter,
} from "@/lib/store/variant-groups";

type BrandLandingClientProps = {
  brandSlug: string;
  brandName: string;
  brandDisplayName: string;
};

const PAGE_SIZE = 24;
const TOTAL_SKU_THRESHOLD = 10;
const INITIAL_VISIBLE = 8;
const REVEAL_STEP = 8;
const MAX_FETCH_ROUNDS = 25;

function subcategoryMatches(productSub: string, filterSub: string): boolean {
  return productSub.trim().toLowerCase() === filterSub.trim().toLowerCase();
}

function productMatchesBrandFilters(
  p: StoreProduct,
  opts: { selectedCategory: string; selectedSub: string; selectedTag: string },
): boolean {
  if (opts.selectedCategory && p.category !== opts.selectedCategory) return false;
  if (opts.selectedSub && !subcategoryMatches(p.subcategory, opts.selectedSub)) return false;
  if (
    opts.selectedTag &&
    !(p.tags ?? []).some((t) => t.toLowerCase() === opts.selectedTag.toLowerCase())
  ) {
    return false;
  }
  return true;
}

function BrandProductSkeleton() {
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

export function BrandLandingClient({ brandSlug, brandName, brandDisplayName }: BrandLandingClientProps) {
  const { openProductModal, addToCart, toggleFavorite, favorites, mergeCatalogProducts } = useStorefrontUi();
  const copy = useMemo(() => getBrandLandingCopy(brandDisplayName), [brandDisplayName]);

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [totalProductCount, setTotalProductCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE);
  const loadingRef = useRef(false);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [categoryChosen, setCategoryChosen] = useState(false);
  const [subChosen, setSubChosen] = useState(false);
  const [filterHint, setFilterHint] = useState<string | null>(null);
  const [hintTarget, setHintTarget] = useState<"category" | "sub" | null>(null);

  const filterOpts = useMemo(
    () => ({ selectedCategory, selectedSub, selectedTag }),
    [selectedCategory, selectedSub, selectedTag],
  );

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      const qs = new URLSearchParams({ take: String(PAGE_SIZE) });
      if (cursor) qs.set("cursor", cursor);
      const res = await fetch(`/api/store/brand/${encodeURIComponent(brandSlug)}/products?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No se pudo cargar productos");
      const data = (await res.json()) as {
        products?: StoreProduct[];
        nextCursor?: string | null;
        hasMore?: boolean;
        totalCount?: number;
      };
      return {
        batch: Array.isArray(data.products) ? data.products : [],
        nextCursor: data.nextCursor ?? null,
        hasMore: Boolean(data.hasMore ?? data.nextCursor),
        totalCount: typeof data.totalCount === "number" ? data.totalCount : null,
      };
    },
    [brandSlug],
  );

  const mergeLocal = useCallback((prev: StoreProduct[], batch: StoreProduct[]) => {
    const map = new Map(prev.map((p) => [p.id, p]));
    for (const p of batch) map.set(p.id, p);
    return Array.from(map.values());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setProducts([]);
    setNextCursor(null);
    setHasMore(true);
    setTotalProductCount(0);
    setVisibleLimit(INITIAL_VISIBLE);
    setCatalogLoading(true);
    loadingRef.current = true;

    void (async () => {
      try {
        let local: StoreProduct[] = [];
        let cursor: string | null = null;
        let more = true;
        let total: number | null = null;
        let rounds = 0;

        while (more && rounds < MAX_FETCH_ROUNDS) {
          const page = await fetchPage(cursor);
          if (cancelled) return;
          if (page.totalCount != null) total = page.totalCount;
          local = mergeLocal(local, page.batch);
          mergeCatalogProducts(page.batch);
          cursor = page.nextCursor;
          more = page.hasMore;
          rounds += 1;
          const needMin =
            (total ?? 0) > TOTAL_SKU_THRESHOLD ? INITIAL_VISIBLE : Number.POSITIVE_INFINITY;
          if (local.length >= needMin || !more) break;
        }

        if (cancelled) return;
        setProducts(local);
        setNextCursor(cursor);
        setHasMore(more);
        if (total != null) setTotalProductCount(total);
        else setTotalProductCount(local.length);
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
  }, [brandSlug, fetchPage, mergeCatalogProducts, mergeLocal]);

  const loadMoreBrand = useCallback(async () => {
    if (!hasMore || catalogLoading || loadingRef.current) return;
    setCatalogLoading(true);
    loadingRef.current = true;
    try {
      const page = await fetchPage(nextCursor);
      setProducts((prev) => mergeLocal(prev, page.batch));
      mergeCatalogProducts(page.batch);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      if (page.totalCount != null) setTotalProductCount(page.totalCount);
    } catch {
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setCatalogLoading(false);
    }
  }, [hasMore, catalogLoading, nextCursor, fetchPage, mergeLocal, mergeCatalogProducts]);

  useEffect(() => {
    setVisibleLimit(INITIAL_VISIBLE);
  }, [selectedCategory, selectedSub, selectedTag]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort((a, b) =>
      getCategoryLabel(a).localeCompare(getCategoryLabel(b), "es"),
    );
  }, [products]);

  const subOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (selectedCategory && p.category !== selectedCategory) continue;
      const s = p.subcategory.trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products, selectedCategory]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (selectedCategory && p.category !== selectedCategory) continue;
      if (selectedSub && !subcategoryMatches(p.subcategory, selectedSub)) continue;
      for (const t of p.tags ?? []) if (t.trim()) set.add(t.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products, selectedCategory, selectedSub]);

  const filtered = useMemo(
    () => products.filter((p) => productMatchesBrandFilters(p, filterOpts)),
    [products, filterOpts],
  );

  const displayProducts = useMemo(
    () =>
      enrichStorefrontDisplayProducts(
        resolveStorefrontDisplayAfterFilter(filtered, products),
        products,
      ),
    [filtered, products],
  );

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
    void loadMoreBrand().then(() => setVisibleLimit((n) => n + REVEAL_STEP));
  };

  const flashHint = (target: "category" | "sub", message: string) => {
    setHintTarget(target);
    setFilterHint(message);
  };

  const pickCategory = (value: string) => {
    setCategoryChosen(true);
    setSelectedCategory(value);
    setSelectedSub("");
    setSelectedTag("");
    setSubChosen(false);
    setFilterHint(null);
    setHintTarget(null);
  };

  const pickSub = (value: string) => {
    if (!categoryChosen) {
      flashHint("category", "Primero selecciona una categoría.");
      return;
    }
    setSubChosen(true);
    setSelectedSub(value);
    setSelectedTag("");
    setFilterHint(null);
    setHintTarget(null);
  };

  const pickTag = (value: string) => {
    if (!categoryChosen) {
      flashHint("category", "Primero selecciona una categoría.");
      return;
    }
    if (!subChosen) {
      flashHint("sub", "Primero selecciona una subcategoría.");
      return;
    }
    setSelectedTag(value);
    setFilterHint(null);
    setHintTarget(null);
  };

  useReveal();

  const showInitialSkeleton = catalogLoading && products.length === 0;
  const hasActiveFilters = Boolean(selectedCategory || selectedSub || selectedTag);

  const heroCopy = (
    <div className="category-landing-hero-copy">
      <div className="gb-tech-chip">
        <span className="gb-tech-live-dot" style={{ width: 6, height: 6 }} aria-hidden />
        Marca destacada
      </div>
      <div className="category-landing-eyebrow">Colección {brandDisplayName}</div>
      <h1 className="category-landing-title">{copy.headline}</h1>
      <p className="category-landing-subtitle">{copy.subtitle}</p>
      <div className="category-landing-stats">
        <span className="category-landing-stat">
          ◈ {catalogLoading && totalProductCount === 0 ? "…" : totalProductCount} productos
        </span>
        <span className="category-landing-stat">⬡ {categoryOptions.length} categorías</span>
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
            setSelectedCategory("");
            setSelectedSub("");
            setSelectedTag("");
            setCategoryChosen(false);
            setSubChosen(false);
            setFilterHint(null);
          }}
        >
          {copy.ctaExplore}
        </button>
      </div>
    </div>
  );

  return (
    <main className="category-landing-page brand-landing-page">
      <section
        className="category-landing-hero section-pad category-landing-hero--brand"
        data-landing-slug={`marca-${brandSlug}`}
        aria-label={`Marca ${brandDisplayName}`}
      >
        <TechAmbient variant="page" />
        <div className="category-landing-hero-glow" aria-hidden />
        <div className="container category-landing-hero-inner">
          <div className="category-landing-hero-visual" aria-hidden>
            <span className="category-landing-icon brand-landing-mark">
              {brandDisplayName.charAt(0)}
            </span>
          </div>
          {heroCopy}
        </div>
      </section>

      <section className="section-pad reveal" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="category-filter-panel">
            <div className="category-filter-title">Filtrar productos de {brandDisplayName}</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
              Elige en orden: categoría → subcategoría → etiqueta.
            </p>
            <div className="category-filter-grid">
              <div className={hintTarget === "category" ? "category-filter-step is-hint" : "category-filter-step"}>
                <div className="category-filter-label">1. Categoría</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${categoryChosen && selectedCategory === "" ? " active" : ""}`}
                    onClick={() => pickCategory("")}
                  >
                    Todas
                  </button>
                  {categoryOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`category-filter-chip${selectedCategory === c ? " active" : ""}`}
                      onClick={() => pickCategory(c)}
                    >
                      {getCategoryLabel(c)}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`category-filter-step${!categoryChosen ? " is-locked" : ""}${
                  hintTarget === "sub" ? " is-hint" : ""
                }`}
              >
                <div className="category-filter-label">2. Subcategoría</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${subChosen && selectedSub === "" ? " active" : ""}`}
                    onClick={() => pickSub("")}
                  >
                    Todas
                  </button>
                  {subOptions.map((s) => (
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

              <div className={`category-filter-step${!subChosen ? " is-locked" : ""}`}>
                <div className="category-filter-label">3. Etiquetas</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${selectedTag === "" && subChosen ? " active" : ""}`}
                    onClick={() => pickTag("")}
                  >
                    Todas
                  </button>
                  {tagOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`category-filter-chip${selectedTag === t ? " active" : ""}`}
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
                ? `${filtered.length} producto(s) con filtros activos`
                : `Mostrando ${shownProducts.length} de ${totalProductCount} en ${brandDisplayName}`}
            {catalogLoading && products.length > 0 ? " · cargando más…" : ""}
          </p>

          {showInitialSkeleton ? (
            <BrandProductSkeleton />
          ) : filtered.length === 0 ? (
            <div className="admin-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>
              No hay productos para estos filtros.
            </div>
          ) : (
            <>
              <div className="products-grid category-landing-products">
                {shownProducts.map((p, i) => (
                  <StoreProductCard
                    key={`${brandSlug}-${p.id}`}
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
      <span className="sr-only">{brandName}</span>
    </main>
  );
}
