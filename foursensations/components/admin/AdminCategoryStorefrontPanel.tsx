"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminCategoryStorefrontProductCard } from "@/app/api/admin/categories/[id]/storefront-order/route";
import {
  fetchCategoryStorefrontOrder,
  saveCategoryStorefrontOrder,
} from "@/lib/api/admin-category-storefront";
import { CATEGORY_STOREFRONT_FEATURED_COUNT } from "@/lib/category-storefront-featured";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import { formatPrice } from "@/lib/format";
import { isHttpImageUrl } from "@/lib/util/image-url";

type AdminCategoryStorefrontPanelProps = {
  active: boolean;
  categories: AdminCategoryTree[];
  showToast: (msg: string, type?: string, icon?: string) => void;
};

function productThumb(p: AdminCategoryStorefrontProductCard) {
  if (isHttpImageUrl(p.imageUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.imageUrl!} alt="" className="cat-vitrina-card__img" />
    );
  }
  return <span className="cat-vitrina-card__emoji">{p.emoji || "📦"}</span>;
}

function reorderFeatured(ids: string[], from: number, to: number): string[] {
  const next = [...ids];
  const [item] = next.splice(from, 1);
  if (!item) return ids;
  next.splice(to, 0, item);
  return next;
}

function insertFeatured(ids: string[], productId: string, to: number, max: number): string[] {
  const without = ids.filter((id) => id !== productId);
  const next = [...without];
  next.splice(Math.min(to, next.length), 0, productId);
  return next.slice(0, max);
}

export function AdminCategoryStorefrontPanel({
  active,
  categories,
  showToast,
}: AdminCategoryStorefrontPanelProps) {
  const sortedCats = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es")),
    [categories],
  );
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalInCategory, setTotalInCategory] = useState(0);
  const [products, setProducts] = useState<AdminCategoryStorefrontProductCard[]>([]);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [savedFeaturedIds, setSavedFeaturedIds] = useState<string[]>([]);
  const [poolQuery, setPoolQuery] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragFromSlot, setDragFromSlot] = useState<number | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

  const slotCount = CATEGORY_STOREFRONT_FEATURED_COUNT;
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const loadCategory = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchCategoryStorefrontOrder(id);
      setFeaturedIds(data.featuredIds);
      setSavedFeaturedIds(data.featuredIds);
      setProducts(data.products);
      setTotalInCategory(data.products.length);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al cargar vitrina", "danger", "⚠️");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!active || !categoryId) return;
    void loadCategory(categoryId);
  }, [active, categoryId, loadCategory]);

  useEffect(() => {
    if (!active) return;
    if (!categoryId && sortedCats[0]) setCategoryId(sortedCats[0].id);
  }, [active, categoryId, sortedCats]);

  const slots = useMemo(() => {
    return Array.from({ length: slotCount }, (_, i) => featuredIds[i] ?? null);
  }, [featuredIds, slotCount]);

  const featuredSet = useMemo(() => new Set(featuredIds), [featuredIds]);

  const poolProducts = useMemo(() => {
    const q = poolQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (featuredSet.has(p.id)) return false;
      if (!q) return true;
      return [p.name, p.brand, p.subcategory].join(" ").toLowerCase().includes(q);
    });
  }, [products, featuredSet, poolQuery]);

  const dirty = useMemo(
    () => featuredIds.join("|") !== savedFeaturedIds.join("|"),
    [featuredIds, savedFeaturedIds],
  );

  const endDrag = useCallback(() => {
    setDraggingId(null);
    setDragFromSlot(null);
    setHoverSlot(null);
  }, []);

  const onSlotDrop = useCallback(
    (toIndex: number, productId: string, fromSlot: number | null) => {
      if (fromSlot !== null) {
        const fromCompact = featuredIds.indexOf(productId);
        if (fromCompact === -1) return;
        if (fromCompact !== toIndex) {
          setFeaturedIds((prev) => reorderFeatured(prev, fromCompact, toIndex));
        }
      } else {
        setFeaturedIds((prev) => insertFeatured(prev, productId, toIndex, slotCount));
      }
    },
    [featuredIds, slotCount],
  );

  const startDrag = (productId: string, fromSlot: number | null) => {
    setDraggingId(productId);
    setDragFromSlot(fromSlot);
  };

  useEffect(() => {
    if (!draggingId) return;

    const onPointerMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = el?.closest("[data-vitrina-slot]") as HTMLElement | null;
      if (slotEl) {
        const idx = Number(slotEl.dataset.vitrinaSlot);
        if (!Number.isNaN(idx)) setHoverSlot(idx);
      } else {
        setHoverSlot(null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const slotEl = el?.closest("[data-vitrina-slot]") as HTMLElement | null;
      if (slotEl) {
        const idx = Number(slotEl.dataset.vitrinaSlot);
        if (!Number.isNaN(idx)) {
          onSlotDrop(idx, draggingId, dragFromSlot);
        }
      }
      endDrag();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [draggingId, dragFromSlot, onSlotDrop, endDrag]);

  const addToVitrina = (productId: string) => {
    if (featuredIds.length >= slotCount) {
      showToast(`La vitrina solo tiene ${slotCount} puestos. Quita uno antes de añadir otro.`, "default", "ℹ️");
      return;
    }
    setFeaturedIds((prev) => insertFeatured(prev, productId, prev.length, slotCount));
  };

  const moveInVitrina = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= featuredIds.length) return;
    setFeaturedIds((prev) => reorderFeatured(prev, index, target));
  };

  const handleSave = async () => {
    if (!categoryId) return;
    setSaving(true);
    try {
      const res = await saveCategoryStorefrontOrder(categoryId, featuredIds);
      setFeaturedIds(res.featuredIds);
      setSavedFeaturedIds(res.featuredIds);
      showToast("Vitrina guardada: orden publicado en la tienda", "success", "✨");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  const selectedCat = sortedCats.find((c) => c.id === categoryId);

  return (
    <div className="cat-vitrina-admin">
      <div className="cat-vitrina-admin__hero">
        <div className="cat-vitrina-admin__hero-glow" aria-hidden />
        <div>
          <div className="cat-vitrina-admin__eyebrow">Experiencia de categoría</div>
          <h2 className="admin-card-title" style={{ marginBottom: 8 }}>
            Gestión de <em>PRODUCTOS</em> en Categorías
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 720, margin: 0, lineHeight: 1.55 }}>
            Aquí defines los <strong>6 productos que la tienda carga primero</strong> al abrir una categoría. El
            listado inferior muestra <strong>todos los productos activos</strong> de esa categoría para que puedas
            elegir cuáles subir a la vitrina. El resto del catálogo en la tienda se carga después, en segundo plano.
          </p>
        </div>
      </div>

      <div className="cat-vitrina-admin__toolbar">
        <label className="form-label" style={{ margin: 0 }}>
          Categoría
        </label>
        <select
          className="form-select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={loading || sortedCats.length === 0}
          style={{ maxWidth: 320 }}
        >
          {sortedCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={!categoryId || loading}
          onClick={() => void loadCategory(categoryId)}
        >
          Recargar
        </button>
        <button
          type="button"
          className={`btn btn-primary btn-sm${saving ? " admin-btn--loading-pulse" : ""}`}
          disabled={!categoryId || saving || loading}
          onClick={() => void handleSave()}
        >
          {saving ? "Guardando…" : "Publicar vitrina"}
        </button>
      </div>

      {loading ? (
        <div className="admin-card cat-vitrina-admin__loading">Cargando productos de {selectedCat?.name ?? "…"}</div>
      ) : sortedCats.length === 0 ? (
        <div className="admin-card">Crea categorías primero en «Categorías y subcategorías».</div>
      ) : (
        <>
          <section className="cat-vitrina-stage" aria-label="Vitrina de categoría">
            <div className="cat-vitrina-stage__head">
              <span className="cat-vitrina-stage__title">
                {selectedCat?.icon} Vitrina tienda — {selectedCat?.name}
              </span>
              <span className="cat-vitrina-stage__hint">
                {featuredIds.length}/{slotCount} puestos · carga instantánea en la tienda
              </span>
            </div>
            <p className="cat-vitrina-stage__help">
              Arrastra un producto desde abajo, o usa las flechas ← → en cada tarjeta. También puedes pulsar «Añadir a
              vitrina» en el catálogo.
            </p>
            <div className="cat-vitrina-slots">
              {slots.map((pid, index) => {
                const p = pid ? productById.get(pid) : null;
                const isHover = hoverSlot === index && draggingId;
                return (
                  <div
                    key={`slot-${index}`}
                    data-vitrina-slot={index}
                    className={`cat-vitrina-slot${isHover ? " cat-vitrina-slot--hover" : ""}${p ? " cat-vitrina-slot--filled" : ""}`}
                  >
                    <span className="cat-vitrina-slot__index">{index + 1}</span>
                    {p ? (
                      <div
                        className={`cat-vitrina-card${draggingId === p.id ? " cat-vitrina-card--dragging" : ""}`}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          startDrag(p.id, index);
                        }}
                      >
                        <div className="cat-vitrina-card__move-row">
                          <button
                            type="button"
                            className="cat-vitrina-move-btn"
                            aria-label="Mover a la izquierda"
                            disabled={index === 0}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => moveInVitrina(index, -1)}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            className="cat-vitrina-move-btn"
                            aria-label="Mover a la derecha"
                            disabled={index >= featuredIds.length - 1}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => moveInVitrina(index, 1)}
                          >
                            →
                          </button>
                        </div>
                        {productThumb(p)}
                        <div className="cat-vitrina-card__meta">
                          <div className="cat-vitrina-card__name">{p.name}</div>
                          <div className="cat-vitrina-card__sub">{formatPrice(p.price)}</div>
                        </div>
                        <button
                          type="button"
                          className="cat-vitrina-card__remove"
                          aria-label="Quitar de vitrina"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => setFeaturedIds((prev) => prev.filter((id) => id !== p.id))}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="cat-vitrina-slot__empty">
                        <span>Soltar aquí</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="cat-vitrina-pool" aria-label="Catálogo de la categoría">
            <div className="cat-vitrina-pool__head">
              <div>
                <span className="cat-vitrina-pool__title">Resto del catálogo ({totalInCategory} activos)</span>
                <p className="cat-vitrina-pool__subtitle">
                  Productos de esta categoría que aún no están en la vitrina ({poolProducts.length} visibles)
                </p>
              </div>
              <input
                type="search"
                className="form-input cat-vitrina-pool__search"
                placeholder="Buscar por nombre, marca…"
                value={poolQuery}
                onChange={(e) => setPoolQuery(e.target.value)}
              />
            </div>
            <div className="cat-vitrina-pool__grid">
              {poolProducts.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13, gridColumn: "1 / -1" }}>
                  {totalInCategory === 0
                    ? "No hay productos activos en esta categoría."
                    : featuredIds.length >= slotCount
                      ? "Los 6 puestos de la vitrina están ocupados. Quita uno arriba para añadir otro, o reordena con las flechas."
                      : "Todos los productos visibles ya están en la vitrina."}
                </p>
              ) : (
                poolProducts.map((p) => (
                  <div
                    key={p.id}
                    className={`cat-vitrina-card cat-vitrina-card--pool${draggingId === p.id ? " cat-vitrina-card--dragging" : ""}`}
                    onPointerDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      startDrag(p.id, null);
                    }}
                  >
                    {productThumb(p)}
                    <div className="cat-vitrina-card__meta">
                      <div className="cat-vitrina-card__name">{p.name}</div>
                      <div className="cat-vitrina-card__sub">
                        {p.subcategory} · {formatPrice(p.price)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm cat-vitrina-card__add"
                      disabled={featuredIds.length >= slotCount}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => addToVitrina(p.id)}
                    >
                      + Añadir a vitrina
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {dirty && (
            <p className="cat-vitrina-admin__unsaved" role="status">
              Hay cambios sin publicar. Pulsa «Publicar vitrina» para aplicarlos en la tienda.
            </p>
          )}
        </>
      )}
    </div>
  );
}
