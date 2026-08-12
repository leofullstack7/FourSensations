"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import logoImage from "@/assets/logo.png";
import {
  fetchAdminCombos,
  fetchAdminCombosCatalog,
  postAdminCombo,
  type AdminComboCatalogProduct,
  type AdminComboRow,
} from "@/lib/api/admin-combos";
import { formatPrice } from "@/lib/format";
import { isHttpImageUrl } from "@/lib/util/image-url";

type RailLine = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  emoji: string | null;
  quantity: number;
};

function parseCopInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

export function AdminCombosPanel({
  active,
  showToast,
}: {
  active: boolean;
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const [view, setView] = useState<"list" | "builder">("list");
  const [combos, setCombos] = useState<AdminComboRow[]>([]);
  const [combosLoading, setCombosLoading] = useState(false);
  const [combosError, setCombosError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<AdminComboCatalogProduct[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    brands: string[];
    categories: string[];
    subcategories: string[];
    tags: string[];
  }>({ brands: [], categories: [], subcategories: [], tags: [] });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterBrand, setFilterBrand] = useState("");

  const [comboName, setComboName] = useState("");
  const [comboPriceInput, setComboPriceInput] = useState("");
  const [railLines, setRailLines] = useState<RailLine[]>([]);
  const [preview, setPreview] = useState<AdminComboCatalogProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedListComboId, setSelectedListComboId] = useState<string | null>(null);

  const loadCombos = useCallback(async () => {
    setCombosLoading(true);
    setCombosError(null);
    try {
      const { combos: rows } = await fetchAdminCombos();
      setCombos(rows);
    } catch (e) {
      setCombosError(e instanceof Error ? e.message : "Error al cargar combos");
    } finally {
      setCombosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void loadCombos();
  }, [active, loadCombos]);

  useEffect(() => {
    if (!selectedListComboId) return;
    if (!combos.some((c) => c.id === selectedListComboId)) {
      setSelectedListComboId(null);
    }
  }, [combos, selectedListComboId]);

  const selectedListCombo = useMemo(
    () => (selectedListComboId ? combos.find((c) => c.id === selectedListComboId) ?? null : null),
    [combos, selectedListComboId]
  );

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(searchInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setFilterSubcategory("");
  }, [filterCategory]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await fetchAdminCombosCatalog({
        q: searchDebounced,
        category: filterCategory,
        subcategory: filterSubcategory,
        tag: filterTag,
        brand: filterBrand,
      });
      setCatalog(res.products);
      setFilterOptions(res.filterOptions);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al cargar productos", "danger", "⚠️");
    } finally {
      setCatalogLoading(false);
    }
  }, [searchDebounced, filterCategory, filterSubcategory, filterTag, filterBrand, showToast]);

  useEffect(() => {
    if (!active || view !== "builder") return;
    void loadCatalog();
  }, [active, view, loadCatalog]);

  const baseSum = useMemo(
    () => railLines.reduce((acc, l) => acc + l.price * l.quantity, 0),
    [railLines]
  );

  const addProductToRail = useCallback((p: AdminComboCatalogProduct) => {
    setRailLines((prev) => {
      const idx = prev.findIndex((x) => x.productId === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        const cur = copy[idx]!;
        copy[idx] = { ...cur, quantity: cur.quantity + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          price: p.price,
          imageUrl: p.imageUrl,
          emoji: p.emoji,
          quantity: 1,
        },
      ];
    });
    setPreview(null);
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setRailLines((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          return { ...l, quantity: l.quantity + delta };
        })
        .filter((l) => l.quantity > 0)
    );
  }, []);

  const removeLine = useCallback((productId: string) => {
    setRailLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const resetBuilder = useCallback(() => {
    setComboName("");
    setComboPriceInput("");
    setRailLines([]);
    setPreview(null);
    setSearchInput("");
    setFilterCategory("");
    setFilterSubcategory("");
    setFilterTag("");
    setFilterBrand("");
  }, []);

  const handleSaveCombo = useCallback(async () => {
    const name = comboName.trim();
    if (name.length < 2) {
      showToast("Escribe un nombre para el combo", "danger", "⚠️");
      return;
    }
    if (railLines.length === 0) {
      showToast("Añade al menos un producto al combo", "danger", "⚠️");
      return;
    }
    const comboPrice = parseCopInput(comboPriceInput);
    if (comboPrice == null) {
      showToast("Indica un precio de venta válido para el combo", "danger", "⚠️");
      return;
    }
    setSaving(true);
    try {
      await postAdminCombo({
        name,
        comboPrice,
        items: railLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      showToast("Combo guardado correctamente", "success", "✅");
      resetBuilder();
      setView("list");
      await loadCombos();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  }, [comboName, comboPriceInput, railLines, loadCombos, resetBuilder, showToast]);

  const subcategoryOptions = useMemo(() => {
    if (!filterCategory) return filterOptions.subcategories;
    const set = new Set(
      catalog.filter((p) => p.category === filterCategory).map((p) => p.subcategory).filter(Boolean)
    );
    const fromCatalog = [...set].sort((a, b) => a.localeCompare(b, "es"));
    return fromCatalog.length ? fromCatalog : filterOptions.subcategories;
  }, [filterCategory, filterOptions.subcategories, catalog]);

  if (!active) return null;

  return (
    <div className="admin-combos-root">
      {view === "list" ? (
        <div className="admin-combos-list-view">
          <div className="admin-combos-hero-card">
            <div>
              <div className="admin-combos-kicker">Combos promocionales</div>
              <h2 className="admin-combos-list-title">Arma packs irresistibles</h2>
              <p className="admin-combos-list-sub">
                Agrupa productos con poca rotación, define un precio especial y mantén el control desde un solo lugar.
              </p>
            </div>
            <button type="button" className="admin-combos-primary-cta" onClick={() => { setSelectedListComboId(null); setView("builder"); }}>
              <span className="admin-combos-primary-cta-icon">＋</span>
              Añadir nuevo combo
            </button>
          </div>

          {combosError && (
            <div className="admin-combos-alert">
              <strong>Error:</strong> {combosError}{" "}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => void loadCombos()}>
                Reintentar
              </button>
            </div>
          )}

          {combosLoading ? (
            <p className="admin-combos-muted">Cargando combos…</p>
          ) : combos.length === 0 ? (
            <div className="admin-combos-empty">
              <div className="admin-combos-empty-icon">🧩</div>
              <div className="admin-combos-empty-title">Aún no hay combos guardados</div>
              <p className="admin-combos-muted">Crea el primero con el botón de arriba.</p>
            </div>
          ) : (
            <>
            <div className="admin-combos-strip-wrap">
              <div className="admin-combos-strip">
                {combos.map((c) => {
                  const selected = selectedListComboId === c.id;
                  return (
                    <article
                      key={c.id}
                      role="button"
                      aria-label={`Combo: ${c.name}. Pulsa para ver detalle grande.`}
                      aria-pressed={selected}
                      tabIndex={0}
                      className={`admin-combos-strip-card${selected ? " admin-combos-strip-card--selected" : ""}`}
                      onClick={() => setSelectedListComboId((prev) => (prev === c.id ? null : c.id))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedListComboId((prev) => (prev === c.id ? null : c.id));
                        }
                      }}
                    >
                    <div className="admin-combos-strip-card-head">
                      <div className="admin-combos-strip-name">{c.name}</div>
                      <div className="admin-combos-strip-price">{formatPrice(c.comboPrice)}</div>
                    </div>
                    <div className="admin-combos-strip-thumbs">
                      {c.items.map((it) => (
                        <div key={it.id} className="admin-combos-strip-thumb" title={it.product.name}>
                          {isHttpImageUrl(it.product.imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.product.imageUrl!} alt="" />
                          ) : (
                            <span>{it.product.emoji ?? "📦"}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="admin-combos-strip-meta">
                      {c.items.length} producto{c.items.length === 1 ? "" : "s"} · Valor catálogo{" "}
                      {formatPrice(c.items.reduce((a, it) => a + it.product.price * it.quantity, 0))}
                    </div>
                  </article>
                  );
                })}
              </div>
            </div>
            {selectedListCombo ? (
              <section className="admin-combos-list-detail" aria-label="Detalle del combo seleccionado">
                <div className="admin-combos-list-detail-head">
                  <div>
                    <div className="admin-combos-list-detail-kicker">Combo seleccionado</div>
                    <h3 className="admin-combos-list-detail-title">{selectedListCombo.name}</h3>
                    <p className="admin-combos-list-detail-meta">
                      Precio del combo: <strong>{formatPrice(selectedListCombo.comboPrice)}</strong>
                      {" · "}
                      Valor en catálogo:{" "}
                      <strong>
                        {formatPrice(
                          selectedListCombo.items.reduce((a, it) => a + it.product.price * it.quantity, 0)
                        )}
                      </strong>
                      {" · "}
                      {selectedListCombo.items.length} producto{selectedListCombo.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedListComboId(null)}>
                    Cerrar detalle
                  </button>
                </div>
                <div className="admin-combos-list-detail-grid">
                  {selectedListCombo.items.map((it) => (
                    <div key={it.id} className="admin-combos-list-detail-prod">
                      <div className="admin-combos-list-detail-prod-visual">
                        {isHttpImageUrl(it.product.imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.product.imageUrl!} alt="" />
                        ) : (
                          <span className="admin-combos-list-detail-prod-emoji">{it.product.emoji ?? "📦"}</span>
                        )}
                      </div>
                      <div className="admin-combos-list-detail-prod-body">
                        <div className="admin-combos-list-detail-prod-name">{it.product.name}</div>
                        <div className="admin-combos-list-detail-prod-row">
                          <span className="admin-combos-list-detail-prod-price">{formatPrice(it.product.price)}</span>
                          <span className="admin-combos-list-detail-prod-qty">× {it.quantity}</span>
                        </div>
                        <div className="admin-combos-list-detail-prod-sub">
                          Subtotal: {formatPrice(it.product.price * it.quantity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <p className="admin-combos-list-hint">Pulsa un combo de la lista para ver aquí los productos en grande.</p>
            )}
            </>
          )}
        </div>
      ) : (
        <div className="admin-combos-builder">
          <div className="admin-combos-builder-toolbar">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setView("list"); resetBuilder(); }}>
              ← Volver a mis combos
            </button>
          </div>

          <div className="admin-combos-split">
            <div className="admin-combos-main">
              <header className="admin-combos-main-header">
                <div className="admin-combos-brand-lockup">
                  <div className="admin-combos-logo-ring">
                    <Image src={logoImage} alt="" width={72} height={72} className="admin-combos-logo-img" priority />
                  </div>
                  <div>
                    <div className="admin-combos-brand-eyebrow">Crear combos</div>
                    <h2 className="admin-combos-brand-title">
                      Ginna<em>Beauty</em>
                    </h2>
                  </div>
                </div>
                <p className="admin-combos-lead">
                  Crea aquí combos con los productos que quieras y asígnales el precio que corresponda. Te sugerimos priorizar piezas con menor salida para darles
                  visibilidad.
                </p>
              </header>

              <div className="admin-combos-search admin-combos-search-bar">
                <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="search"
                  placeholder="Buscar por nombre de producto…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="admin-combos-filters">
                <select className="form-select admin-combos-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="">Todas las categorías</option>
                  {filterOptions.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select className="form-select admin-combos-select" value={filterSubcategory} onChange={(e) => setFilterSubcategory(e.target.value)}>
                  <option value="">Todas las subcategorías</option>
                  {subcategoryOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select className="form-select admin-combos-select" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                  <option value="">Todas las etiquetas</option>
                  {filterOptions.tags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select className="form-select admin-combos-select" value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
                  <option value="">Todas las marcas</option>
                  {filterOptions.brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-combos-grid-wrap">
                {catalogLoading ? (
                  <p className="admin-combos-muted">Cargando catálogo…</p>
                ) : (
                  <div className="admin-combos-grid">
                    {catalog.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="admin-combos-pcard"
                        onClick={() => setPreview(p)}
                      >
                        <div className="admin-combos-pcard-img">
                          {isHttpImageUrl(p.imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl!} alt="" />
                          ) : (
                            <span className="admin-combos-pcard-emoji">{p.emoji ?? "📦"}</span>
                          )}
                        </div>
                        <div className="admin-combos-pcard-body">
                          <div className="admin-combos-pcard-brand">{p.brand}</div>
                          <div className="admin-combos-pcard-name">{p.name}</div>
                          <div className="admin-combos-pcard-meta">
                            <span>{p.subcategory}</span>
                            <span className="admin-combos-pcard-sold">Ventas: {p.soldQty}</span>
                          </div>
                          <div className="admin-combos-pcard-price">{formatPrice(p.price)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {preview && (
                <div className="admin-combos-detail-scrim" role="presentation" onClick={() => setPreview(null)}>
                  <div
                    className="admin-combos-detail-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Vista previa de producto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button type="button" className="admin-combos-detail-close" onClick={() => setPreview(null)} aria-label="Cerrar">
                      ×
                    </button>
                    <div className="admin-combos-detail-grid">
                      <div className="admin-combos-detail-visual">
                        {isHttpImageUrl(preview.imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview.imageUrl!} alt="" />
                        ) : (
                          <div className="admin-combos-detail-emoji">{preview.emoji ?? "📦"}</div>
                        )}
                      </div>
                      <div>
                        <div className="admin-combos-detail-brand">{preview.brand}</div>
                        <h3 className="admin-combos-detail-name">{preview.name}</h3>
                        <div className="admin-combos-detail-price-row">
                          <span className="admin-combos-detail-price">{formatPrice(preview.price)}</span>
                          <span className="admin-combos-detail-stock">Stock: {preview.stock}</span>
                        </div>
                        <p className="admin-combos-detail-desc">{preview.description}</p>
                        <button type="button" className="btn btn-rose btn-lg admin-combos-add-btn" onClick={() => addProductToRail(preview)}>
                          Poner en el combo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="admin-combos-rail" aria-label="Resumen del combo">
              <div className="admin-combos-rail-inner">
                <label className="admin-combos-field-label" htmlFor="admin-combo-name">
                  Nombre del combo
                </label>
                <input
                  id="admin-combo-name"
                  className="form-input admin-combos-input"
                  placeholder="Ej. Rutina glow fin de semana"
                  value={comboName}
                  onChange={(e) => setComboName(e.target.value)}
                />

                <div className="admin-combos-rail-metrics">
                  <div>
                    <div className="admin-combos-metric-label">Suma catálogo</div>
                    <div className="admin-combos-metric-value">{formatPrice(baseSum)}</div>
                  </div>
                  <div>
                    <div className="admin-combos-metric-label">Precio combo (venta)</div>
                    <input
                      className="form-input admin-combos-input admin-combos-input-compact"
                      inputMode="numeric"
                      placeholder="Ej. 129900"
                      value={comboPriceInput}
                      onChange={(e) => setComboPriceInput(e.target.value)}
                    />
                  </div>
                </div>

                <button type="button" className="btn btn-primary admin-combos-save" disabled={saving} onClick={() => void handleSaveCombo()}>
                  {saving ? "Guardando…" : "Guardar combo"}
                </button>

                <div className="admin-combos-rail-lines-head">Productos en el combo</div>
                {railLines.length === 0 ? (
                  <p className="admin-combos-rail-empty">Toca un producto y úsalo en el combo desde la vista ampliada.</p>
                ) : (
                  <ul className="admin-combos-rail-lines">
                    {railLines.map((l) => (
                      <li key={l.productId} className="admin-combos-rail-line">
                        <div className="admin-combos-rail-line-thumb">
                          {isHttpImageUrl(l.imageUrl) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={l.imageUrl!} alt="" />
                          ) : (
                            <span>{l.emoji ?? "📦"}</span>
                          )}
                        </div>
                        <div className="admin-combos-rail-line-body">
                          <div className="admin-combos-rail-line-name">{l.name}</div>
                          <div className="admin-combos-rail-line-price">{formatPrice(l.price)} × {l.quantity}</div>
                          <div className="admin-combos-rail-line-actions">
                            <button type="button" className="admin-combos-mini" onClick={() => updateQty(l.productId, -1)} aria-label="Menos">
                              −
                            </button>
                            <button type="button" className="admin-combos-mini" onClick={() => updateQty(l.productId, 1)} aria-label="Más">
                              +
                            </button>
                            <button type="button" className="admin-combos-mini danger" onClick={() => removeLine(l.productId)}>
                              Quitar
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
