"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { expireAdminProductDiscounts, postAdminProductDiscounts } from "@/lib/api/admin-discounts";
import { fetchAdminProducts } from "@/lib/api/admin-products";
import { formatPrice } from "@/lib/format";
import { isActiveManagedDiscount } from "@/lib/product-discount";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import type { AdminProduct } from "@/lib/types/admin";
import { isHttpImageUrl } from "@/lib/util/image-url";
import logoImage from "@/app/logo.png";
import Image from "next/image";

function categoryLabel(slug: string, tree: AdminCategoryTree[]): string {
  return tree.find((c) => c.slug === slug)?.name ?? slug;
}

function endOfLocalDayIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

function formatEndsAt(iso: string | null | undefined): string {
  if (!iso) return "Hasta que lo quites";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function productHasDiscount(p: AdminProduct): boolean {
  return isActiveManagedDiscount({
    discountPercent: p.discountPercent,
    discountEndsAt: p.discountEndsAt,
  });
}

export function AdminDiscountsPanel({
  active,
  categories,
  showToast,
}: {
  active: boolean;
  categories: AdminCategoryTree[];
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalIds, setModalIds] = useState<string[]>([]);
  const [percentInput, setPercentInput] = useState("15");
  const [untilMode, setUntilMode] = useState<"date" | "until-removed">("until-removed");
  const [untilDate, setUntilDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await expireAdminProductDiscounts();
      const rows = await fetchAdminProducts();
      setProducts(rows);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudieron cargar productos", "danger", "⚠️");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const b = p.brand?.trim();
      if (b) set.add(b);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const categoryOptions = useMemo(() => {
    const slugs = new Set(products.map((p) => p.category).filter(Boolean));
    return [...slugs]
      .map((slug) => ({ slug, name: categoryLabel(slug, categories) }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [products, categories]);

  const discounted = useMemo(
    () => products.filter(productHasDiscount).sort((a, b) => a.name.localeCompare(b.name, "es")),
    [products],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filterBrand && p.brand !== filterBrand) return false;
      if (filterCategory && p.category !== filterCategory) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, filterBrand, filterCategory]);

  const visibleIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const openApplyModal = (ids: string[]) => {
    if (ids.length === 0) {
      showToast("Selecciona al menos un producto", "danger", "⚠️");
      return;
    }
    setModalIds(ids);
    setPercentInput("15");
    setUntilMode("until-removed");
    setUntilDate("");
    setModalOpen(true);
  };

  const applyDiscount = async () => {
    const pct = Number.parseInt(percentInput, 10);
    if (!Number.isFinite(pct) || pct < 1 || pct > 90) {
      showToast("El porcentaje debe estar entre 1 y 90", "danger", "⚠️");
      return;
    }
    let endsAt: string | null = null;
    if (untilMode === "date") {
      if (!untilDate) {
        showToast("Elige la fecha de fin del descuento", "danger", "⚠️");
        return;
      }
      endsAt = endOfLocalDayIso(untilDate);
      if (!endsAt || new Date(endsAt).getTime() <= Date.now()) {
        showToast("La fecha debe ser posterior a hoy", "danger", "⚠️");
        return;
      }
    }
    setSaving(true);
    try {
      const { updated } = await postAdminProductDiscounts({
        action: "apply",
        ids: modalIds,
        percent: pct,
        endsAt,
      });
      showToast(`Descuento del ${pct}% en ${updated} producto(s)`, "success", "🏷️");
      setModalOpen(false);
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo aplicar el descuento", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  const removeDiscount = async (ids: string[]) => {
    if (ids.length === 0) {
      showToast("Selecciona al menos un producto", "danger", "⚠️");
      return;
    }
    if (!confirm(ids.length === 1 ? "¿Quitar el descuento de este producto?" : `¿Quitar el descuento de ${ids.length} productos?`)) {
      return;
    }
    setSaving(true);
    try {
      const { updated } = await postAdminProductDiscounts({ action: "remove", ids });
      showToast(updated > 0 ? `Descuento quitado en ${updated} producto(s)` : "Ningún producto tenía descuento", "success", "✓");
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo quitar el descuento", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (p: AdminProduct, compact?: boolean) => {
    const activeDisc = productHasDiscount(p);
    const thumb = p.imageUrl;
    return (
      <tr key={p.id}>
        <td style={{ textAlign: "center" }}>
          <input
            type="checkbox"
            checked={selectedIds.has(p.id)}
            aria-label={`Seleccionar ${p.name}`}
            onChange={() => toggleOne(p.id)}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        <td>
          <div className="table-product-cell">
            <div className="table-product-img" style={{ position: "relative", overflow: "hidden" }}>
              {thumb && isHttpImageUrl(thumb) ? (
                <Image src={thumb} alt="" fill sizes="44px" style={{ objectFit: "cover" }} />
              ) : (
                <Image src={logoImage} alt="" width={28} height={28} style={{ objectFit: "contain" }} />
              )}
            </div>
            <div>
              <div className="table-product-name">{p.name}</div>
              <div className="table-product-cat">{p.brand || "—"}</div>
            </div>
          </div>
        </td>
        {!compact ? <td>{categoryLabel(p.category, categories)}</td> : null}
        <td>{formatPrice(p.price)}</td>
        <td>
          {activeDisc ? (
            <span className="admin-discount-pill">
              {p.discountPercent}% desc
              <small>{formatEndsAt(p.discountEndsAt)}</small>
            </span>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Sin descuento</span>
          )}
        </td>
        <td>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-table"
              disabled={saving}
              onClick={() => openApplyModal([p.id])}
            >
              {activeDisc ? "Modificar %" : "Agregar %"}
            </button>
            {activeDisc ? (
              <button
                type="button"
                className="btn-table danger"
                disabled={saving}
                onClick={() => void removeDiscount([p.id])}
              >
                Quitar
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <>
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title">Descuentos por producto</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
          Aplica un porcentaje a uno o varios productos. En la tienda se verá como «15% desc», y el carrito y el
          checkout cobran el precio con descuento.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 12,
          }}
        >
          <div className="search-bar" style={{ width: 260, minWidth: 200, flex: "1 1 200px" }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 150, flex: "1 1 140px" }}>
            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
              Categoría
            </label>
            <select
              className="form-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas</option>
              {categoryOptions.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: 150, flex: "1 1 140px" }}>
            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
              Marca
            </label>
            <select
              className="form-select"
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              aria-label="Filtrar por marca"
            >
              <option value="">Todas</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          {(search || filterBrand || filterCategory) && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ height: 38 }}
              onClick={() => {
                setSearch("");
                setFilterBrand("");
                setFilterCategory("");
              }}
            >
              Limpiar
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            className="btn btn-rose btn-sm"
            disabled={saving || selectedIds.size === 0}
            onClick={() => openApplyModal([...selectedIds])}
          >
            Agregar % de descuento ({selectedIds.size})
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={saving || selectedIds.size === 0}
            onClick={() => void removeDiscount([...selectedIds])}
          >
            Quitar descuento
          </button>
        </div>
      </div>

      {discounted.length > 0 ? (
        <div className="admin-card" style={{ marginBottom: 20, padding: 0 }}>
          <div style={{ padding: "18px 20px 8px" }}>
            <div className="admin-card-title" style={{ marginBottom: 4 }}>
              Productos con descuento
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              {discounted.length} producto(s) con oferta activa. Modifícalos o quítalos desde aquí.
            </p>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }} />
                  <th>Producto</th>
                  <th>Precio actual</th>
                  <th>Descuento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>{discounted.map((p) => renderRow(p, true))}</tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="admin-card" style={{ padding: 0 }}>
        <div style={{ padding: "18px 20px 8px" }}>
          <div className="admin-card-title" style={{ marginBottom: 4 }}>
            Todos los productos
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            {loading ? "Cargando…" : `${filtered.length} resultado(s)`}
          </p>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={visibleIds.length === 0}
                    aria-label="Seleccionar todos los visibles"
                    onChange={toggleAllVisible}
                  />
                </th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Descuento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Cargando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                    Ningún producto coincide con la búsqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => renderRow(p))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`admin-modal-overlay${modalOpen ? " open" : ""}`} role="presentation">
        {modalOpen ? (
          <div
            className="admin-modal"
            role="dialog"
            aria-labelledby="admin-discount-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => !saving && setModalOpen(false)}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h2 id="admin-discount-modal-title" className="admin-card-title" style={{ marginBottom: 8 }}>
              Agregar % de descuento
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 18px" }}>
              Se aplicará a {modalIds.length} producto(s). Si ya tienen descuento, se recalcula sobre el precio base.
            </p>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-discount-percent">
                Porcentaje de descuento
              </label>
              <input
                id="admin-discount-percent"
                type="number"
                min={1}
                max={90}
                className="form-input"
                value={percentInput}
                onChange={(e) => setPercentInput(e.target.value)}
              />
            </div>
            <div className="form-group">
              <span className="form-label">¿Hasta cuándo?</span>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 8, fontSize: 13 }}>
                <input
                  type="radio"
                  name="discount-until"
                  checked={untilMode === "date"}
                  onChange={() => setUntilMode("date")}
                />
                <span>
                  Hasta fecha específica
                  {untilMode === "date" ? (
                    <input
                      type="date"
                      className="form-input"
                      style={{ marginTop: 8 }}
                      value={untilDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setUntilDate(e.target.value)}
                    />
                  ) : null}
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12, fontSize: 13 }}>
                <input
                  type="radio"
                  name="discount-until"
                  checked={untilMode === "until-removed"}
                  onChange={() => setUntilMode("until-removed")}
                />
                <span>Hasta que yo decida quitárselo</span>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" className="btn btn-outline" disabled={saving} onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-rose" disabled={saving} onClick={() => void applyDiscount()}>
                {saving ? "Guardando…" : "Aplicar descuento"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
