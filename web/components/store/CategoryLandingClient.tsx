"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/types/product";
import { formatPrice } from "@/lib/format";
import { isHttpImageUrl } from "@/lib/util/image-url";

type CategoryLandingClientProps = {
  categoryLabel: string;
  categorySlug: string;
  products: StoreProduct[];
  subcategories: string[];
  defaultSubcategory: string;
  defaultTag: string;
  menuTags: string[];
};

function ProductCardLite({ product }: { product: StoreProduct }) {
  return (
    <article className="product-card">
      <div className="product-img-wrap">
        <div className="product-img-placeholder">
          {isHttpImageUrl(product.img) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.img} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            product.emoji
          )}
        </div>
      </div>
      <div className="product-info">
        <div className="product-brand">{product.brand}</div>
        <div className="product-name">{product.name}</div>
        <div className="product-variant">{product.subcategory}</div>
        <div className="product-price-row">
          <span className="price-current">{formatPrice(product.price)}</span>
        </div>
      </div>
    </article>
  );
}

export function CategoryLandingClient({
  categoryLabel,
  categorySlug,
  products,
  subcategories,
  defaultSubcategory,
  defaultTag,
  menuTags,
}: CategoryLandingClientProps) {
  const [selectedSub, setSelectedSub] = useState(defaultSubcategory);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedTag, setSelectedTag] = useState(defaultTag);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const b = p.brand.trim();
      if (b) set.add(b);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of menuTags) set.add(t);
    for (const p of products) {
      for (const t of p.tags ?? []) {
        const v = t.trim();
        if (v) set.add(v);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [menuTags, products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (selectedSub && p.subcategory !== selectedSub) return false;
      if (selectedBrand && p.brand !== selectedBrand) return false;
      if (selectedTag && !(p.tags ?? []).some((t) => t.toLowerCase() === selectedTag.toLowerCase())) return false;
      return true;
    });
  }, [products, selectedSub, selectedBrand, selectedTag]);

  return (
    <main>
      <section className="category-landing-hero section-pad">
        <div className="container">
          <div className="category-landing-eyebrow">Colección {categoryLabel}</div>
          <h1 className="category-landing-title">{categoryLabel} que potencia tu estilo</h1>
          <p className="category-landing-subtitle">
            Descubre fórmulas premium, tonos tendencia y productos favoritos para comprar con confianza.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/" className="btn btn-outline btn-sm">
              ← Volver al home
            </Link>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setSelectedSub("")}>
              Ver toda la categoría
            </button>
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ paddingTop: 24 }}>
        <div className="container">
          <div className="category-filter-panel">
            <div className="category-filter-title">Filtrar productos</div>
            <div className="category-filter-grid">
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
                  {subcategories.map((s) => (
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
                <div className="category-filter-label">Etiquetas</div>
                <div className="category-chip-row">
                  <button
                    type="button"
                    className={`category-filter-chip${selectedTag === "" ? " active" : ""}`}
                    onClick={() => setSelectedTag("")}
                  >
                    Todas
                  </button>
                  {tagOptions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`category-filter-chip${selectedTag === t ? " active" : ""}`}
                      onClick={() => setSelectedTag(t)}
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
            {(selectedSub || selectedBrand || selectedTag) ? " con filtros activos" : ""}
          </p>

          {filtered.length === 0 ? (
            <div className="admin-card" style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>
              No hay productos para estos filtros.
            </div>
          ) : (
            <div className="products-grid">
              {filtered.map((p) => (
                <ProductCardLite key={`${categorySlug}-${p.id}`} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

