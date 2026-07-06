"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useReveal } from "@/hooks/useReveal";
import { TechAmbient } from "@/components/ui/TechAmbient";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { StoreProductCard } from "@/components/store/store-product-card";
import { orderCategoryProductsByFeatured } from "@/lib/category-storefront-featured";
import type { StoreProduct } from "@/lib/types/product";
import { getCategoryLandingCopy } from "@/lib/category-landing-theme";

export type SubcategoryRow = {
  name: string;
  menuTag: string | null;
};

type CategoryLandingClientProps = {
  categoryLabel: string;
  categorySlug: string;
  categoryIcon: string;
  featuredProducts: StoreProduct[];
  featuredOrderIds: string[];
  totalProductCount: number;
  subcategoriesFromDb: SubcategoryRow[];
  grupoLabels: string[];
  defaultGrupo: string;
  defaultSubcategory: string;
  productTagOptions: string[];
  defaultProductTag: string;
};

function normalizeGroup(menuTag: string | null): string {
  return (menuTag?.trim() ? menuTag.trim() : "General") as string;
}

export function CategoryLandingClient({
  categoryLabel,
  categorySlug,
  categoryIcon,
  featuredProducts,
  featuredOrderIds,
  totalProductCount,
  subcategoriesFromDb,
  grupoLabels,
  defaultGrupo,
  defaultSubcategory,
  productTagOptions,
  defaultProductTag,
}: CategoryLandingClientProps) {
  const { openProductModal, addToCart, toggleFavorite, favorites } = useStorefrontUi();
  const [products, setProducts] = useState<StoreProduct[]>(featuredProducts);
  const [catalogLoading, setCatalogLoading] = useState(totalProductCount > featuredProducts.length);
  const [allTags, setAllTags] = useState<string[]>(productTagOptions);

  useEffect(() => {
    setProducts(featuredProducts);
    setCatalogLoading(totalProductCount > featuredProducts.length);
    setAllTags(productTagOptions);
  }, [categorySlug, featuredProducts, totalProductCount, productTagOptions]);

  useEffect(() => {
    if (totalProductCount <= featuredProducts.length) return;
    let cancelled = false;
    setCatalogLoading(true);
    void fetch(`/api/store/category/${encodeURIComponent(categorySlug)}/products`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("No se pudo cargar el catálogo"))))
      .then((data: { products?: StoreProduct[] }) => {
        if (cancelled || !Array.isArray(data.products)) return;
        const ordered = orderCategoryProductsByFeatured(data.products, featuredOrderIds);
        setProducts(ordered);
        const tagSet = new Set<string>(productTagOptions);
        for (const p of data.products) {
          for (const t of p.tags ?? []) tagSet.add(t);
        }
        setAllTags(Array.from(tagSet).sort((a, b) => a.localeCompare(b, "es")));
      })
      .catch(() => {
        /* vitrina ya visible; el resto es progresivo */
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categorySlug, featuredOrderIds, totalProductCount, featuredProducts.length, productTagOptions]);
  const copy = useMemo(() => getCategoryLandingCopy(categoryLabel, categorySlug), [categoryLabel, categorySlug]);
  const [selectedGrupo, setSelectedGrupo] = useState(defaultGrupo);
  const [selectedSub, setSelectedSub] = useState(defaultSubcategory);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedProductTag, setSelectedProductTag] = useState(defaultProductTag);

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
    return products.filter((p) => {
      if (selectedGrupo) {
        const allowed = new Set(
          subcategoriesFromDb.filter((s) => normalizeGroup(s.menuTag) === selectedGrupo).map((s) => s.name)
        );
        if (allowed.size > 0 && !allowed.has(p.subcategory)) return false;
      }
      if (selectedSub && p.subcategory !== selectedSub) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;
      if (
        selectedProductTag &&
        !(p.tags ?? []).some((t) => t.toLowerCase() === selectedProductTag.toLowerCase())
      )
        return false;
      return true;
    });
  }, [products, selectedGrupo, selectedSub, selectedBrand, selectedProductTag, subcategoriesFromDb]);

  const clearSubIfInvalid = (grupo: string) => {
    if (!grupo) return;
    const allowed = new Set(
      subcategoriesFromDb.filter((s) => normalizeGroup(s.menuTag) === grupo).map((s) => s.name)
    );
    if (selectedSub && !allowed.has(selectedSub)) setSelectedSub("");
  };

  useReveal();

  return (
    <main className="category-landing-page">
      <section
        className="category-landing-hero section-pad"
        data-landing-slug={categorySlug}
        aria-label={`Categoría ${categoryLabel}`}
      >
        <TechAmbient variant="page" />
        <div className="category-landing-hero-glow" aria-hidden />
        <div className="container category-landing-hero-inner">
          <div className="category-landing-hero-visual" aria-hidden>
            <span className="category-landing-icon">{categoryIcon}</span>
          </div>
          <div className="category-landing-hero-copy">
            <div className="gb-tech-chip">
              <span className="gb-tech-live-dot" style={{ width: 6, height: 6 }} aria-hidden />
              Catálogo inteligente
            </div>
            <div className="category-landing-eyebrow">Colección {categoryLabel}</div>
            <h1 className="category-landing-title">{copy.headline}</h1>
            <p className="category-landing-subtitle">{copy.subtitle}</p>
            <div className="category-landing-stats">
              <span className="category-landing-stat">◈ {totalProductCount} productos</span>
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
                    onClick={() => {
                      setSelectedGrupo("");
                    }}
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

          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "14px 0 20px" }}>
            {filtered.length} producto(s) en <strong>{categoryLabel}</strong>
            {selectedGrupo || selectedSub || selectedBrand || selectedProductTag ? " con filtros activos" : ""}
            {catalogLoading ? " · cargando catálogo completo…" : ""}
          </p>

          {subcategoriesFromDb.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--dusty-rose)", marginBottom: 16 }}>
              No hay subcategorías registradas en la base de datos para esta categoría. Agrégalas en el panel
              administrativo.
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="admin-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>
              No hay productos para estos filtros.
            </div>
          ) : (
            <div className="products-grid category-landing-products">
              {filtered.map((p, i) => (
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
          )}
        </div>
      </section>
    </main>
  );
}
