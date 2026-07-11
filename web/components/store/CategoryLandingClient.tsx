"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { useStoreNavigation } from "@/components/store/StoreNavigationProvider";
import { TechAmbient } from "@/components/ui/TechAmbient";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { StoreProductCard } from "@/components/store/store-product-card";
import type { StoreProduct } from "@/lib/types/product";
import { getCategoryLandingCopy } from "@/lib/category-landing-theme";
import { getCategoryLandingBanner } from "@/lib/category-banners";
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

function normalizeGroup(menuTag: string | null): string {
  return (menuTag?.trim() ? menuTag.trim() : "General") as string;
}

function subcategoryMatches(productSub: string, filterSub: string): boolean {
  return productSub.trim().toLowerCase() === filterSub.trim().toLowerCase();
}

function productMatchesCategoryFilters(
  p: StoreProduct,
  opts: {
    selectedGrupo: string;
    selectedSub: string;
    selectedBrand: string;
    selectedProductTag: string;
    subcategoriesFromDb: SubcategoryRow[];
  }
): boolean {
  const { selectedGrupo, selectedSub, selectedBrand, selectedProductTag, subcategoriesFromDb } = opts;
  if (selectedGrupo) {
    const allowed = new Set(
      subcategoriesFromDb.filter((s) => normalizeGroup(s.menuTag) === selectedGrupo).map((s) => s.name)
    );
    if (allowed.size > 0 && !Array.from(allowed).some((name) => subcategoryMatches(p.subcategory, name))) {
      return false;
    }
  }
  if (selectedSub && !subcategoryMatches(p.subcategory, selectedSub)) return false;
  if (selectedBrand && p.brand !== selectedBrand) return false;
  if (
    selectedProductTag &&
    !(p.tags ?? []).some((t) => t.toLowerCase() === selectedProductTag.toLowerCase())
  ) {
    return false;
  }
  return true;
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

  const fetchCategoryPage = useCallback(
    async (skip: number, append: boolean) => {
      const url = `/api/store/category/${encodeURIComponent(categorySlug)}/products?skip=${skip}&take=${CATEGORY_PAGE_SIZE}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar productos");
      const data = (await res.json()) as {
        products?: StoreProduct[];
        hasMore?: boolean;
        totalCount?: number;
      };
      const batch = Array.isArray(data.products) ? data.products : [];
      if (typeof data.totalCount === "number") setTotalProductCount(data.totalCount);
      if (batch.length === 0) {
        setHasMore(false);
        return batch;
      }
      setProducts((prev) => {
        if (!append) return batch;
        const map = new Map(prev.map((p) => [p.id, p]));
        for (const p of batch) map.set(p.id, p);
        return Array.from(map.values());
      });
      mergeCatalogProducts(batch);
      setRestSkip(skip + batch.length);
      setHasMore(Boolean(data.hasMore));
      setAllTags((prev) => {
        const tagSet = new Set(prev);
        for (const p of batch) {
          for (const t of p.tags ?? []) tagSet.add(t);
        }
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "es"));
      });
      return batch;
    },
    [categorySlug, mergeCatalogProducts]
  );

  useEffect(() => {
    let cancelled = false;
    setProducts([]);
    setRestSkip(0);
    setHasMore(true);
    setTotalProductCount(0);
    setAllTags([]);
    setCatalogLoading(true);

    void fetchCategoryPage(0, false)
      .catch(() => {
        if (!cancelled) setHasMore(false);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [categorySlug, fetchCategoryPage]);

  const loadMoreCategory = useCallback(() => {
    if (!hasMore || catalogLoading) return;
    setCatalogLoading(true);
    void fetchCategoryPage(restSkip, true)
      .catch(() => setHasMore(false))
      .finally(() => setCatalogLoading(false));
  }, [hasMore, catalogLoading, fetchCategoryPage, restSkip]);

  const copy = useMemo(() => getCategoryLandingCopy(categoryLabel, categorySlug), [categoryLabel, categorySlug]);
  const [selectedGrupo, setSelectedGrupo] = useState(defaultGrupo);
  const [selectedSub, setSelectedSub] = useState(defaultSubcategory);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedProductTag, setSelectedProductTag] = useState(defaultProductTag);

  useEffect(() => {
    setSelectedGrupo(defaultGrupo);
    setSelectedSub(defaultSubcategory);
    setSelectedProductTag(defaultProductTag);
  }, [defaultGrupo, defaultSubcategory, defaultProductTag, categorySlug]);

  useEffect(() => {
    if (!categoryNavFilters) return;
    if (categoryNavFilters.grupo) setSelectedGrupo(categoryNavFilters.grupo);
    if (categoryNavFilters.sub) setSelectedSub(categoryNavFilters.sub);
    if (categoryNavFilters.tag) setSelectedProductTag(categoryNavFilters.tag);
  }, [categoryNavFilters]);

  const subNamesInDb = useMemo(() => subcategoriesFromDb.map((s) => s.name), [subcategoriesFromDb]);

  const visibleSubNames = useMemo(() => {
    if (!selectedGrupo) return subNamesInDb;
    return subcategoriesFromDb
      .filter((s) => normalizeGroup(s.menuTag) === selectedGrupo)
      .map((s) => s.name);
  }, [subcategoriesFromDb, selectedGrupo, subNamesInDb]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const b = p.brand.trim();
      if (b) set.add(b);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) =>
      productMatchesCategoryFilters(p, {
        selectedGrupo,
        selectedSub,
        selectedBrand,
        selectedProductTag,
        subcategoriesFromDb,
      })
    );
  }, [products, selectedGrupo, selectedSub, selectedBrand, selectedProductTag, subcategoriesFromDb]);

  const displayProducts = useMemo(
    () =>
      enrichStorefrontDisplayProducts(
        resolveStorefrontDisplayAfterFilter(filtered, products),
        products
      ),
    [filtered, products]
  );

  const hasActiveFilters = Boolean(selectedGrupo || selectedSub || selectedBrand || selectedProductTag);

  useEffect(() => {
    if (!hasActiveFilters) return;
    if (filtered.length > 0) return;
    if (!hasMore || catalogLoading) return;
    loadMoreCategory();
  }, [hasActiveFilters, filtered.length, hasMore, catalogLoading, loadMoreCategory]);

  const clearSubIfInvalid = (grupo: string) => {
    if (!grupo) return;
    const allowed = new Set(
      subcategoriesFromDb.filter((s) => normalizeGroup(s.menuTag) === grupo).map((s) => s.name)
    );
    if (selectedSub && !allowed.has(selectedSub)) setSelectedSub("");
  };

  useReveal();

  const showInitialSkeleton = catalogLoading && products.length === 0;
  const bannerSrc = getCategoryLandingBanner(categorySlug);

  return (
    <main className="category-landing-page">
      <section
        className={`category-landing-hero section-pad${bannerSrc ? " category-landing-hero--has-banner" : ""}`}
        data-landing-slug={categorySlug}
        style={bannerSrc ? { backgroundImage: `url(${bannerSrc})` } : undefined}
        aria-label={`Categoría ${categoryLabel}`}
      >
        <TechAmbient variant="page" />
        <div className="category-landing-hero-glow" aria-hidden />
        <div className="category-landing-hero-overlay" aria-hidden />
        <div className="container category-landing-hero-inner">
          {!bannerSrc ? (
            <div className="category-landing-hero-visual" aria-hidden>
              <span className="category-landing-icon">{categoryIcon}</span>
            </div>
          ) : null}
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
                }}
              >
                {copy.ctaExplore}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad reveal" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="category-filter-panel">
            <div className="category-filter-title">Filtrar productos</div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
              Subcategorías y grupos según tu catálogo en base de datos.
            </p>
            <div className="category-filter-grid">
              <div>
                <div className="category-filter-label">Grupo del menú</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${selectedGrupo === "" ? " active" : ""}`}
                    onClick={() => setSelectedGrupo("")}
                  >
                    Todos
                  </button>
                  {grupoLabels.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`category-filter-chip${selectedGrupo === g ? " active" : ""}`}
                      onClick={() => {
                        setSelectedGrupo(g);
                        clearSubIfInvalid(g);
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="category-filter-label">Subcategorías</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${selectedSub === "" ? " active" : ""}`}
                    onClick={() => setSelectedSub("")}
                  >
                    Todas
                  </button>
                  {visibleSubNames.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`category-filter-chip${selectedSub === s ? " active" : ""}`}
                      onClick={() => setSelectedSub(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="category-filter-label">Familias / marcas</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${selectedBrand === "" ? " active" : ""}`}
                    onClick={() => setSelectedBrand("")}
                  >
                    Todas
                  </button>
                  {brandOptions.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`category-filter-chip${selectedBrand === b ? " active" : ""}`}
                      onClick={() => setSelectedBrand(b)}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="category-filter-label">Etiquetas de producto</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${selectedProductTag === "" ? " active" : ""}`}
                    onClick={() => setSelectedProductTag("")}
                  >
                    Todas
                  </button>
                  {allTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`category-filter-chip${selectedProductTag === t ? " active" : ""}`}
                      onClick={() => setSelectedProductTag(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "14px 0 12px" }}>
            {showInitialSkeleton
              ? "Cargando productos…"
              : selectedGrupo || selectedSub || selectedBrand || selectedProductTag
                ? `${filtered.length} producto(s) con filtros activos`
                : `Mostrando ${products.length} de ${totalProductCount} en ${categoryLabel}`}
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
                {displayProducts.map((p, i) => (
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
              {hasMore ? (
                <div style={{ display: "flex", justifyContent: "center", margin: "28px 0 8px" }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={loadMoreCategory}
                    disabled={catalogLoading}
                  >
                    {catalogLoading
                      ? "Cargando productos…"
                      : `Cargar más productos (${Math.max(0, totalProductCount - products.length)} restantes)`}
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
