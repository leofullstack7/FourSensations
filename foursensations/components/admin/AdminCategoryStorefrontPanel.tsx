"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminCategoryStorefrontProductCard } from "@/app/api/admin/categories/[id]/storefront-order/route";
import {
  fetchCategoryStorefrontOrder,
  saveCategoryStorefrontOrder,
} from "@/lib/api/admin-category-storefront";
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

function insertFeatured(ids: string[], productId: string, to: number): string[] {
  const without = ids.filter((id) => id !== productId);
  const next = [...without];
  next.splice(Math.min(Math.max(0, to), next.length), 0, productId);
  return next;
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
  const [stageQuery, setStageQuery] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragFromSlot, setDragFromSlot] = useState<number | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

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
      setPoolQuery("");
      setStageQuery("");
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

  /** Slots = productos en orden + 1 hueco vacío al final para soltar. */
  const slots = useMemo(() => {
    return [...featuredIds, null] as Array<string | null>;
  }, [featuredIds]);

  const featuredSet = useMemo(() => new Set(featuredIds), [featuredIds]);

  const poolProducts = useMemo(() => {
    const q = poolQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (featuredSet.has(p.id)) return false;
      if (!q) return true;
      return [p.name, p.brand, p.subcategory].join(" ").toLowerCase().includes(q);
    });
  }, [products, featuredSet, poolQuery]);

  const stageHighlightIds = useMemo(() => {
    const q = stageQuery.trim().toLowerCase();
    if (!q) return null;
    const hits = new Set<string>();
    for (const id of featuredIds) {
      const p = productById.get(id);
      if (!p) continue;
      if ([p.name, p.brand, p.subcategory].join(" ").toLowerCase().includes(q)) hits.add(id);
    }
    return hits;
  }, [stageQuery, featuredIds, productById]);

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
        setFeaturedIds((prev) => {
          const fromCompact = prev.indexOf(productId);
          if (fromCompact === -1) return prev;
          if (toIndex >= prev.length) {
            const without = prev.filter((id) => id !== productId);
            without.push(productId);
            return without;
          }
          if (fromCompact === toIndex) return prev;
          return reorderFeatured(prev, fromCompact, toIndex);
        });
      } else {
        setFeaturedIds((prev) => insertFeatured(prev, productId, toIndex));
      }
    },
    [],
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
    setFeaturedIds((prev) => insertFeatured(prev, productId, prev.length));
  };

  const addAllToVitrina = () => {
    setFeaturedIds((prev) => {
      const seen = new Set(prev);
      const next = [...prev];
      for (const p of products) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        next.push(p.id);
      }
      return next;
    });
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
            Define el <strong>orden exacto</strong> en que se muestran los productos al abrir una categoría.
            Puedes incluir <strong>todos</strong> los productos activos, buscarlos por nombre y arrastrarlos a la
            posición que quieras. Sin límite de puestos.
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
          className="btn btn-outline btn-sm"
          disabled={loading || products.length === 0 || poolProducts.length === 0}
          onClick={addAllToVitrina}
          title="Pasa todos los productos del catálogo a la vitrina"
        >
          Añadir todos
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
                {selectedCat?.icon} Orden en tienda — {selectedCat?.name}
              </span>
              <span className="cat-vitrina-stage__hint">
                {featuredIds.length} en vitrina · {totalInCategory} activos en la categoría
              </span>
            </div>
            <p className="cat-vitrina-stage__help">
              Arrastra desde el catálogo inferior o reordena con las flechas. El hueco vacío al final sirve para
              soltar un producto nuevo. Busca arriba para resaltar un producto ya en la vitrina.
            </p>
            <div className="cat-vitrina-stage__tools">
              <input
                type="search"
                className="form-input cat-vitrina-pool__search"
                placeholder="Buscar en la vitrina…"
                value={stageQuery}
                onChange={(e) => setStageQuery(e.target.value)}
              />
            </div>
            <div className="cat-vitrina-slots">
              {slots.map((pid, index) => {
                const p = pid ? productById.get(pid) : null;
                const isHover = hoverSlot === index && draggingId;
                const isHighlight = p && stageHighlightIds ? stageHighlightIds.has(p.id) : false;
                const isDimmed = p && stageHighlightIds && stageHighlightIds.size > 0 && !isHighlight;
                return (
                  <div
                    key={p ? `slot-${p.id}` : `slot-empty-${index}`}
                    data-vitrina-slot={index}
                    className={`cat-vitrina-slot${isHover ? " cat-vitrina-slot--hover" : ""}${p ? " cat-vitrina-slot--filled" : ""}${isHighlight ? " cat-vitrina-slot--match" : ""}${isDimmed ? " cat-vitrina-slot--dim" : ""}`}
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
                        <span>Soltar aquí para añadir al final</span>
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
                <span className="cat-vitrina-pool__title">Catálogo fuera de vitrina</span>
                <p className="cat-vitrina-pool__subtitle">
                  {poolProducts.length} visibles · busca por nombre y arrastra o pulsa «Añadir»
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
                    : poolQuery.trim()
                      ? "Ningún producto coincide con la búsqueda."
                      : "Todos los productos activos ya están en la vitrina. Reordénalos arriba."}
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
