"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import { listVariantsInGroup } from "@/lib/admin/variant-groups";
import { formatPrice } from "@/lib/format";
import type { AdminProduct } from "@/lib/types/admin";
import { isHttpImageUrl } from "@/lib/util/image-url";
import { normalizeColorHex } from "@/lib/product-color";

function VariantThumb({
  imageUrl,
  emoji,
  onExpand,
}: {
  imageUrl: string | null;
  emoji: string;
  onExpand?: () => void;
}) {
  const hasImage = isHttpImageUrl(imageUrl);
  const inner = hasImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  ) : (
    <span>{emoji || "📦"}</span>
  );

  if (!hasImage || !onExpand) {
    return (
      <div className="table-product-img" style={{ width: 72, height: 72, flexShrink: 0 }}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="admin-variant-image-btn admin-variant-image-btn--main"
      onClick={onExpand}
      title="Ampliar imagen"
      aria-label="Ampliar imagen del producto"
    >
      <div className="table-product-img" style={{ width: 72, height: 72, flexShrink: 0 }}>
        {inner}
      </div>
    </button>
  );
}

function VariantGalleryThumb({ src, onExpand }: { src: string; onExpand: () => void }) {
  return (
    <button
      type="button"
      className="admin-variant-image-btn admin-variant-image-btn--gallery"
      onClick={onExpand}
      title="Ampliar imagen"
      aria-label="Ampliar imagen"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
    </button>
  );
}

type Props = {
  open: boolean;
  anchorProduct: AdminProduct | null;
  allProducts: AdminProduct[];
  categoryTree: AdminCategoryTree[];
  deletingId: string | null;
  onClose: () => void;
  onDeleteVariant: (id: string) => void | Promise<void>;
  categoryDisplayName: (slug: string, tree: AdminCategoryTree[]) => string;
  onEditVariantColor?: (variant: AdminProduct) => void;
  onMergeVariants?: (payload: {
    survivorId: string;
    absorbedIds: string[];
    name: string;
  }) => Promise<void>;
};

export function AdminProductVariantsModal({
  open,
  anchorProduct,
  allProducts,
  categoryTree,
  deletingId,
  onClose,
  onDeleteVariant,
  categoryDisplayName,
  onEditVariantColor,
  onMergeVariants,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [mergeNameMode, setMergeNameMode] = useState<"pick" | "custom">("pick");
  const [mergePickedId, setMergePickedId] = useState("");
  const [mergeCustomName, setMergeCustomName] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setExpandedImage(null);
      setSelectedIds(new Set());
      setMergeOpen(false);
      setMergeCustomName("");
    }
  }, [open]);

  const variants = useMemo(() => {
    if (!anchorProduct?.variantGroupCode?.trim()) return [];
    return listVariantsInGroup(allProducts, anchorProduct.variantGroupCode);
  }, [anchorProduct, allProducts]);

  const selectedVariants = useMemo(
    () => variants.filter((v) => selectedIds.has(v.id)),
    [variants, selectedIds]
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMergeOpen(false);
  };

  const openMerge = () => {
    const first = selectedVariants[0];
    if (!first || selectedVariants.length < 2) return;
    const primary = selectedVariants.find((v) => (v.variantGroupOrder ?? 0) === 0) ?? first;
    setMergePickedId(primary.id);
    setMergeNameMode("pick");
    setMergeCustomName("");
    setMergeOpen(true);
  };

  const confirmMerge = () => {
    if (!onMergeVariants || selectedVariants.length < 2) return;
    const picked = selectedVariants.find((v) => v.id === mergePickedId) ?? selectedVariants[0]!;
    const name =
      mergeNameMode === "custom" ? mergeCustomName.trim() : picked.name.trim();
    if (!name) return;
    const survivorId = mergeNameMode === "pick" ? picked.id : selectedVariants[0]!.id;
    const absorbedIds = selectedVariants.map((v) => v.id).filter((id) => id !== survivorId);
    void (async () => {
      setMergeBusy(true);
      try {
        await onMergeVariants({ survivorId, absorbedIds, name });
        setSelectedIds(new Set());
        setMergeOpen(false);
      } finally {
        setMergeBusy(false);
      }
    })();
  };

  if (!mounted || !open || !anchorProduct || variants.length < 2) return null;

  const groupLabel = anchorProduct.variantGroupCode?.trim() ?? "—";

  return createPortal(
    <>
      <div
        className={`admin-modal-overlay admin-variants-modal-overlay${open ? " open" : ""}`}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="presentation"
      >
        <div className="admin-modal admin-variants-modal" style={{ maxWidth: 920, maxHeight: "90vh", overflow: "auto" }}>
          <button type="button" className="modal-close admin-variants-modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--dark)",
            marginBottom: 6,
          }}
        >
          Variantes del producto
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          Grupo <strong>{groupLabel}</strong> · {variants.length} variante(s)
        </p>
        {selectedVariants.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 14,
              padding: "10px 12px",
              borderRadius: 10,
              background: "white",
              border: "1px solid var(--line)",
            }}
          >
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {selectedVariants.length} variante(s) seleccionada(s)
            </span>
            {selectedVariants.length >= 2 && onMergeVariants ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={mergeBusy}
                onClick={openMerge}
              >
                Juntar en un mismo producto
              </button>
            ) : (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Selecciona al menos 2 para juntar fotos en un solo producto
              </span>
            )}
          </div>
        ) : null}
        {mergeOpen && selectedVariants.length >= 2 ? (
          <div
            style={{
              marginBottom: 14,
              padding: 14,
              borderRadius: 12,
              border: "1px solid var(--dusty-rose)",
              background: "#fffafc",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              ¿Con qué nombre se queda el producto?
            </div>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
              Las fotografías de las variantes seleccionadas se unen en un solo producto. Los demás se
              eliminan.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {selectedVariants.map((v) => (
                <label
                  key={v.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-start",
                    fontSize: 13,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border:
                      mergeNameMode === "pick" && mergePickedId === v.id
                        ? "1px solid var(--dusty-rose)"
                        : "1px solid var(--cream)",
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="admin-variant-merge-name"
                    checked={mergeNameMode === "pick" && mergePickedId === v.id}
                    onChange={() => {
                      setMergeNameMode("pick");
                      setMergePickedId(v.id);
                    }}
                  />
                  <span>
                    <strong>{v.name}</strong>
                  </span>
                </label>
              ))}
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 13,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: mergeNameMode === "custom" ? "1px solid var(--dusty-rose)" : "1px solid var(--cream)",
                  background: "#fff",
                }}
              >
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="radio"
                    name="admin-variant-merge-name"
                    checked={mergeNameMode === "custom"}
                    onChange={() => setMergeNameMode("custom")}
                  />
                  Escribir otro nombre
                </span>
                <input
                  className="form-input"
                  value={mergeCustomName}
                  disabled={mergeNameMode !== "custom"}
                  placeholder="Nombre del producto unificado"
                  onChange={(e) => setMergeCustomName(e.target.value)}
                  onFocus={() => setMergeNameMode("custom")}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={mergeBusy}
                onClick={() => setMergeOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={mergeBusy}
                onClick={confirmMerge}
              >
                {mergeBusy ? "Juntando…" : "Confirmar y juntar fotos"}
              </button>
            </div>
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {variants.map((v) => {
            const isPrimary = (v.variantGroupOrder ?? 0) === 0;
            const gallery = v.images ?? [];
            const variantColor = normalizeColorHex(v.colorHex);
            return (
              <div
                key={v.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 14,
                  background: "var(--ivory)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px 1fr auto",
                    gap: 14,
                    alignItems: "start",
                  }}
                >
                  <VariantThumb
                    imageUrl={v.imageUrl}
                    emoji={v.emoji}
                    onExpand={
                      isHttpImageUrl(v.imageUrl) ? () => setExpandedImage(v.imageUrl!) : undefined
                    }
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: "var(--dark)", fontSize: 15 }}>{v.name}</span>
                      {isPrimary && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "var(--blush)",
                            color: "var(--dark)",
                          }}
                        >
                          Principal
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                      Código: <strong>{v.externalRef ?? "—"}</strong>
                      {v.variantGroupOrder != null && (
                        <span style={{ marginLeft: 10 }}>Orden: {v.variantGroupOrder + 1}</span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 8,
                        fontSize: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Valor: </span>
                        <strong>{formatPrice(v.price)}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Categoría: </span>
                        {categoryDisplayName(v.category, categoryTree)}
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Subcategoría: </span>
                        {v.subcategory || "—"}
                      </div>
                    </div>
                    {(v.tags?.length ?? 0) > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {v.tags.map((tag) => (
                          <span
                            key={`${v.id}-${tag}`}
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "white",
                              border: "1px solid var(--line)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {(v.imageUrl || gallery.length > 0) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        {v.imageUrl && isHttpImageUrl(v.imageUrl) && (
                          <VariantGalleryThumb src={v.imageUrl} onExpand={() => setExpandedImage(v.imageUrl!)} />
                        )}
                        {gallery.map((img) =>
                          isHttpImageUrl(img.url) ? (
                            <VariantGalleryThumb
                              key={img.id}
                              src={img.url}
                              onExpand={() => setExpandedImage(img.url)}
                            />
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-table danger"
                    disabled={deletingId === v.id}
                    onClick={() => void onDeleteVariant(v.id)}
                    title="Eliminar esta variante"
                  >
                    {deletingId === v.id ? "…" : "🗑️"}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {variantColor ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: variantColor,
                          border: "2px solid white",
                          boxShadow: "0 0 0 1px var(--line)",
                        }}
                      />
                      <span>
                        {variantColor}
                        {v.colorName?.trim() ? ` · ${v.colorName.trim()}` : ""}
                      </span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sin color asignado</span>
                  )}
                  {onEditVariantColor ? (
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => onEditVariantColor(v)}>
                      {variantColor ? "Editar color" : "Agregar color"}
                    </button>
                  ) : null}
                  </div>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      marginLeft: "auto",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.id)}
                      onChange={() => toggleSelected(v.id)}
                      aria-label={`Seleccionar variante ${v.name}`}
                    />
                    Juntar
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {expandedImage && (
        <div
          className="admin-variant-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de imagen"
          onClick={() => setExpandedImage(null)}
        >
          <button
            type="button"
            className="modal-close admin-variant-image-lightbox-close"
            onClick={() => setExpandedImage(null)}
            aria-label="Cerrar vista ampliada"
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedImage}
            alt=""
            className="admin-variant-image-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>,
    document.body
  );
}
