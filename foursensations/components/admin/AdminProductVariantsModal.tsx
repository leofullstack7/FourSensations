"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import { listVariantsInGroup } from "@/lib/admin/variant-groups";
import type { AdminProduct } from "@/lib/types/admin";
import {
  addProductGalleryImage,
  removeProductGalleryImage,
  uploadAdminProductImage,
} from "@/lib/api/admin-upload";
import { updateAdminProduct } from "@/lib/api/admin-products";
import { isHttpImageUrl } from "@/lib/util/image-url";
import { isValidColorHex, normalizeColorHex } from "@/lib/product-color";

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

export type VariantEditDraft = {
  name: string;
  price: string;
  wholesalePrice: string;
  description: string;
  brand: string;
  subcategory: string;
  stock: string;
  emoji: string;
  badge: string;
  tags: string;
  colorHex: string;
  colorName: string;
  externalRef: string;
};

function draftFromProduct(v: AdminProduct): VariantEditDraft {
  return {
    name: v.name ?? "",
    price: String(v.price ?? 0),
    wholesalePrice: v.wholesalePrice != null ? String(v.wholesalePrice) : "",
    description: v.description ?? "",
    brand: v.brand ?? "",
    subcategory: v.subcategory ?? "",
    stock: String(v.stock ?? 0),
    emoji: v.emoji ?? "",
    badge: v.badge ?? "",
    tags: (v.tags ?? []).join(", "),
    colorHex: v.colorHex ?? "",
    colorName: v.colorName ?? "",
    externalRef: v.externalRef ?? "",
  };
}

function draftsEqual(a: VariantEditDraft, b: VariantEditDraft): boolean {
  return (
    a.name === b.name &&
    a.price === b.price &&
    a.wholesalePrice === b.wholesalePrice &&
    a.description === b.description &&
    a.brand === b.brand &&
    a.subcategory === b.subcategory &&
    a.stock === b.stock &&
    a.emoji === b.emoji &&
    a.badge === b.badge &&
    a.tags === b.tags &&
    a.colorHex === b.colorHex &&
    a.colorName === b.colorName &&
    a.externalRef === b.externalRef
  );
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(/[^\d-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

const BADGE_VALUES = ["new", "hot", "sale", "best"] as const;
type BadgeValue = (typeof BADGE_VALUES)[number];

export type VariantSavePayload = {
  name: string;
  price: number;
  wholesalePrice: number | null;
  description: string;
  brand: string;
  subcategory: string;
  stock: number;
  emoji: string | null;
  badge: BadgeValue | null;
  tags: string[];
  colorHex: string | null;
  colorName: string | null;
  externalRef: string | null;
};

type Props = {
  open: boolean;
  anchorProduct: AdminProduct | null;
  allProducts: AdminProduct[];
  categoryTree: AdminCategoryTree[];
  deletingId: string | null;
  savingId?: string | null;
  onClose: () => void;
  onDeleteVariant: (id: string) => void | Promise<void>;
  onSaveVariant?: (id: string, payload: VariantSavePayload) => void | Promise<void>;
  /** Tras subir/quitar fotos de una variante (WebP vía /api/admin/upload). */
  onVariantProductUpdated?: (product: AdminProduct) => void | Promise<void>;
  categoryDisplayName: (slug: string, tree: AdminCategoryTree[]) => string;
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
  savingId = null,
  onClose,
  onDeleteVariant,
  onSaveVariant,
  onVariantProductUpdated,
  categoryDisplayName,
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
  const [drafts, setDrafts] = useState<Record<string, VariantEditDraft>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
  const [imageBusyId, setImageBusyId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setExpandedImage(null);
      setSelectedIds(new Set());
      setMergeOpen(false);
      setMergeCustomName("");
      setDrafts({});
      setFieldErrors({});
      setImageBusyId(null);
    }
  }, [open]);

  const variants = useMemo(() => {
    if (!anchorProduct?.variantGroupCode?.trim()) return [];
    return listVariantsInGroup(allProducts, anchorProduct.variantGroupCode);
  }, [anchorProduct, allProducts]);

  useEffect(() => {
    if (!open || variants.length === 0) return;
    setDrafts((prev) => {
      const next: Record<string, VariantEditDraft> = {};
      for (const v of variants) {
        const server = draftFromProduct(v);
        const local = prev[v.id];
        // Conserva ediciones sucias; tras guardar (o sin draft local) sincroniza del servidor.
        if (local && !draftsEqual(local, server) && savingId !== v.id) {
          next[v.id] = local;
        } else {
          next[v.id] = server;
        }
      }
      return next;
    });
  }, [open, variants, savingId]);

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

  const patchDraft = (id: string, patch: Partial<VariantEditDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? draftFromProduct(variants.find((x) => x.id === id)!)), ...patch },
    }));
    setFieldErrors((prev) => ({ ...prev, [id]: null }));
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

  const saveVariant = async (v: AdminProduct) => {
    if (!onSaveVariant) return;
    const draft = drafts[v.id] ?? draftFromProduct(v);
    const name = draft.name.trim();
    if (!name) {
      setFieldErrors((prev) => ({ ...prev, [v.id]: "El nombre es obligatorio" }));
      return;
    }
    const price = parseOptionalInt(draft.price);
    if (price == null || price < 0) {
      setFieldErrors((prev) => ({ ...prev, [v.id]: "El valor debe ser un número entero ≥ 0" }));
      return;
    }
    const stock = parseOptionalInt(draft.stock);
    if (stock == null || stock < 0) {
      setFieldErrors((prev) => ({ ...prev, [v.id]: "El stock debe ser un número entero ≥ 0" }));
      return;
    }
    let wholesalePrice: number | null = null;
    if (draft.wholesalePrice.trim()) {
      wholesalePrice = parseOptionalInt(draft.wholesalePrice);
      if (wholesalePrice == null || wholesalePrice < 0) {
        setFieldErrors((prev) => ({ ...prev, [v.id]: "Mayorista inválido" }));
        return;
      }
    }
    const hexRaw = draft.colorHex.trim();
    let colorHex: string | null = null;
    if (hexRaw) {
      if (!isValidColorHex(hexRaw)) {
        setFieldErrors((prev) => ({ ...prev, [v.id]: "Color hex inválido (ej. #C9A6E8)" }));
        return;
      }
      colorHex = normalizeColorHex(hexRaw);
    }
    const tags = draft.tags
      .split(/[,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    setFieldErrors((prev) => ({ ...prev, [v.id]: null }));
    const badgeRaw = draft.badge.trim();
    const badge: BadgeValue | null =
      badgeRaw && (BADGE_VALUES as readonly string[]).includes(badgeRaw)
        ? (badgeRaw as BadgeValue)
        : null;

    const subcategory = draft.subcategory.trim() || v.subcategory?.trim() || "General";
    await onSaveVariant(v.id, {
      name,
      price,
      wholesalePrice,
      description: draft.description.trim(),
      brand: draft.brand.trim() || "Four Sensations",
      subcategory,
      stock,
      emoji: draft.emoji.trim() || null,
      badge,
      tags,
      colorHex,
      colorName: draft.colorName.trim() || null,
      externalRef: draft.externalRef.trim() || null,
    });
  };

  const notifyProductUpdated = async (updated: AdminProduct) => {
    if (onVariantProductUpdated) await onVariantProductUpdated(updated);
  };

  const uploadVariantMainImage = async (v: AdminProduct, file: File) => {
    setImageBusyId(v.id);
    setFieldErrors((prev) => ({ ...prev, [v.id]: null }));
    try {
      const previousMain = v.imageUrl?.trim() || null;
      const url = await uploadAdminProductImage(file);
      let updated = await updateAdminProduct(v.id, { imageUrl: url });
      const galleryHasPrevious = (updated.images ?? []).some((im) => im.url === previousMain);
      if (
        previousMain &&
        isHttpImageUrl(previousMain) &&
        previousMain !== url &&
        !galleryHasPrevious
      ) {
        updated = await addProductGalleryImage(v.id, previousMain);
      }
      await notifyProductUpdated(updated);
    } catch (e) {
      setFieldErrors((prev) => ({
        ...prev,
        [v.id]: e instanceof Error ? e.message : "No se pudo subir la imagen principal",
      }));
    } finally {
      setImageBusyId(null);
    }
  };

  const uploadVariantGalleryImage = async (v: AdminProduct, file: File) => {
    if ((v.images?.length ?? 0) >= 24) {
      setFieldErrors((prev) => ({ ...prev, [v.id]: "Máximo 24 imágenes adicionales" }));
      return;
    }
    setImageBusyId(v.id);
    setFieldErrors((prev) => ({ ...prev, [v.id]: null }));
    try {
      const url = await uploadAdminProductImage(file);
      const updated = await addProductGalleryImage(v.id, url);
      await notifyProductUpdated(updated);
    } catch (e) {
      setFieldErrors((prev) => ({
        ...prev,
        [v.id]: e instanceof Error ? e.message : "No se pudo añadir la imagen",
      }));
    } finally {
      setImageBusyId(null);
    }
  };

  const removeVariantGalleryImage = async (v: AdminProduct, imageId: string) => {
    setImageBusyId(v.id);
    setFieldErrors((prev) => ({ ...prev, [v.id]: null }));
    try {
      const updated = await removeProductGalleryImage(v.id, imageId);
      await notifyProductUpdated(updated);
    } catch (e) {
      setFieldErrors((prev) => ({
        ...prev,
        [v.id]: e instanceof Error ? e.message : "No se pudo eliminar la imagen",
      }));
    } finally {
      setImageBusyId(null);
    }
  };

  const clearVariantMainImage = async (v: AdminProduct) => {
    if (!v.imageUrl) return;
    if (!confirm("¿Quitar la foto principal de esta variante?")) return;
    setImageBusyId(v.id);
    setFieldErrors((prev) => ({ ...prev, [v.id]: null }));
    try {
      const updated = await updateAdminProduct(v.id, { imageUrl: null });
      await notifyProductUpdated(updated);
    } catch (e) {
      setFieldErrors((prev) => ({
        ...prev,
        [v.id]: e instanceof Error ? e.message : "No se pudo quitar la foto principal",
      }));
    } finally {
      setImageBusyId(null);
    }
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
        <div className="admin-modal admin-variants-modal" style={{ maxWidth: 960, maxHeight: "90vh", overflow: "auto" }}>
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
          Grupo <strong>{groupLabel}</strong> · {variants.length} variante(s). Edita nombre, valor, color,
          descripción y guarda cada variante.
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
            const draft = drafts[v.id] ?? draftFromProduct(v);
            const baseline = draftFromProduct(v);
            const dirty = !draftsEqual(draft, baseline);
            const previewHex = normalizeColorHex(draft.colorHex) ?? "#CCCCCC";
            const busy = savingId === v.id || imageBusyId === v.id;
            const err = fieldErrors[v.id];
            const imageBusy = imageBusyId === v.id;

            return (
              <div
                key={v.id}
                style={{
                  border: dirty ? "1px solid var(--dusty-rose)" : "1px solid var(--line)",
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
                    emoji={draft.emoji || v.emoji}
                    onExpand={
                      isHttpImageUrl(v.imageUrl) ? () => setExpandedImage(v.imageUrl!) : undefined
                    }
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <input
                        className="form-input"
                        value={draft.name}
                        disabled={busy}
                        onChange={(e) => patchDraft(v.id, { name: e.target.value })}
                        aria-label="Nombre de la variante"
                        style={{ flex: "1 1 220px", fontWeight: 600, fontSize: 15 }}
                      />
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

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Valor (COP)</span>
                        <input
                          className="form-input"
                          inputMode="numeric"
                          value={draft.price}
                          disabled={busy}
                          onChange={(e) => patchDraft(v.id, { price: e.target.value })}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Mayorista</span>
                        <input
                          className="form-input"
                          inputMode="numeric"
                          value={draft.wholesalePrice}
                          disabled={busy}
                          placeholder="Opcional"
                          onChange={(e) => patchDraft(v.id, { wholesalePrice: e.target.value })}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Stock</span>
                        <input
                          className="form-input"
                          inputMode="numeric"
                          value={draft.stock}
                          disabled={busy}
                          onChange={(e) => patchDraft(v.id, { stock: e.target.value })}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Código</span>
                        <input
                          className="form-input"
                          value={draft.externalRef}
                          disabled={busy}
                          placeholder="—"
                          onChange={(e) => patchDraft(v.id, { externalRef: e.target.value })}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Orden</span>
                        <input
                          className="form-input"
                          value={v.variantGroupOrder != null ? String(v.variantGroupOrder + 1) : "—"}
                          disabled
                          readOnly
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Categoría</span>
                        <input
                          className="form-input"
                          value={categoryDisplayName(v.category, categoryTree)}
                          disabled
                          readOnly
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Subcategoría</span>
                        <input
                          className="form-input"
                          value={draft.subcategory}
                          disabled={busy}
                          onChange={(e) => patchDraft(v.id, { subcategory: e.target.value })}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Marca</span>
                        <input
                          className="form-input"
                          value={draft.brand}
                          disabled={busy}
                          onChange={(e) => patchDraft(v.id, { brand: e.target.value })}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Emoji</span>
                        <input
                          className="form-input"
                          value={draft.emoji}
                          disabled={busy}
                          maxLength={8}
                          onChange={(e) => patchDraft(v.id, { emoji: e.target.value })}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
                        <span style={{ color: "var(--text-muted)" }}>Badge</span>
                        <select
                          className="form-input"
                          value={draft.badge}
                          disabled={busy}
                          onChange={(e) => patchDraft(v.id, { badge: e.target.value })}
                        >
                          <option value="">Sin badge</option>
                          <option value="new">new</option>
                          <option value="hot">hot</option>
                          <option value="sale">sale</option>
                          <option value="best">best</option>
                        </select>
                      </label>
                    </div>

                    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, marginBottom: 10 }}>
                      <span style={{ color: "var(--text-muted)" }}>Descripción</span>
                      <textarea
                        className="form-input"
                        value={draft.description}
                        disabled={busy}
                        rows={3}
                        onChange={(e) => patchDraft(v.id, { description: e.target.value })}
                        style={{ resize: "vertical", minHeight: 72 }}
                      />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, marginBottom: 10 }}>
                      <span style={{ color: "var(--text-muted)" }}>Etiquetas (separadas por coma)</span>
                      <input
                        className="form-input"
                        value={draft.tags}
                        disabled={busy}
                        onChange={(e) => patchDraft(v.id, { tags: e.target.value })}
                      />
                    </label>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "flex-end",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="color"
                          value={normalizeColorHex(draft.colorHex) ?? "#CCCCCC"}
                          disabled={busy}
                          onChange={(e) =>
                            patchDraft(v.id, {
                              colorHex: e.target.value.toUpperCase(),
                            })
                          }
                          title="Elegir color"
                          style={{
                            width: 40,
                            height: 36,
                            padding: 0,
                            border: "1px solid var(--line)",
                            borderRadius: 8,
                            background: previewHex,
                            cursor: busy ? "not-allowed" : "pointer",
                          }}
                        />
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            backgroundColor: previewHex,
                            border: "2px solid white",
                            boxShadow: "0 0 0 1px var(--line)",
                          }}
                        />
                      </div>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, flex: "1 1 120px" }}>
                        <span style={{ color: "var(--text-muted)" }}>Color hex</span>
                        <input
                          className="form-input"
                          value={draft.colorHex}
                          disabled={busy}
                          placeholder="#C9A6E8"
                          onChange={(e) => patchDraft(v.id, { colorHex: e.target.value })}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, flex: "1 1 140px" }}>
                        <span style={{ color: "var(--text-muted)" }}>Nombre del color</span>
                        <input
                          className="form-input"
                          value={draft.colorName}
                          disabled={busy}
                          placeholder="Lila, Rosado…"
                          onChange={(e) => patchDraft(v.id, { colorName: e.target.value })}
                        />
                      </label>
                    </div>

                    <div
                      className="admin-card"
                      style={{
                        marginTop: 4,
                        marginBottom: 8,
                        padding: 12,
                        border: "1px solid rgba(201, 145, 139, 0.28)",
                        background: "rgba(255,252,250,0.92)",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>
                        Fotos de esta variante
                      </div>
                      <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        Principal y adicionales propias de esta variante. Al subir, se optimizan a WebP automáticamente.
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
                        <label
                          className="btn btn-outline btn-sm"
                          style={{ cursor: imageBusy ? "wait" : "pointer", margin: 0 }}
                        >
                          {imageBusy ? "Subiendo…" : "📤 Principal"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            style={{ display: "none" }}
                            disabled={busy}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f) return;
                              void uploadVariantMainImage(v, f);
                            }}
                          />
                        </label>
                        <label
                          className="btn btn-outline btn-sm"
                          style={{ cursor: imageBusy ? "wait" : "pointer", margin: 0 }}
                        >
                          ➕ Adicional
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            style={{ display: "none" }}
                            disabled={busy || gallery.length >= 24}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f) return;
                              void uploadVariantGalleryImage(v, f);
                            }}
                          />
                        </label>
                        {v.imageUrl ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={busy}
                            onClick={() => void clearVariantMainImage(v)}
                          >
                            Quitar principal
                          </button>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {v.imageUrl && isHttpImageUrl(v.imageUrl) ? (
                          <span style={{ position: "relative", display: "inline-block" }}>
                            <VariantGalleryThumb
                              src={v.imageUrl}
                              onExpand={() => setExpandedImage(v.imageUrl!)}
                            />
                            <span
                              style={{
                                position: "absolute",
                                left: 3,
                                bottom: 3,
                                fontSize: 9,
                                fontWeight: 700,
                                padding: "1px 5px",
                                borderRadius: 999,
                                background: "rgba(40,20,30,0.75)",
                                color: "#fff",
                              }}
                            >
                              Principal
                            </span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sin foto principal</span>
                        )}
                        {gallery.map((img) =>
                          isHttpImageUrl(img.url) ? (
                            <span key={img.id} style={{ position: "relative", display: "inline-block" }}>
                              <VariantGalleryThumb
                                src={img.url}
                                onExpand={() => setExpandedImage(img.url)}
                              />
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void removeVariantGalleryImage(v, img.id)}
                                title="Eliminar imagen adicional"
                                aria-label="Eliminar imagen adicional"
                                style={{
                                  position: "absolute",
                                  top: -6,
                                  right: -6,
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  border: "none",
                                  background: "var(--dusty-rose)",
                                  color: "#fff",
                                  fontSize: 11,
                                  cursor: busy ? "wait" : "pointer",
                                  lineHeight: 1,
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>

                    {err ? (
                      <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--danger, #b00020)" }}>{err}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="btn-table danger"
                    disabled={deletingId === v.id || busy}
                    onClick={() => void onDeleteVariant(v.id)}
                    title="Eliminar esta variante"
                  >
                    {deletingId === v.id ? "…" : "🗑️"}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.id)}
                      onChange={() => toggleSelected(v.id)}
                      aria-label={`Seleccionar variante ${draft.name || v.name}`}
                    />
                    Juntar
                  </label>
                  <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                    {dirty ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={busy}
                        onClick={() => patchDraft(v.id, draftFromProduct(v))}
                      >
                        Descartar
                      </button>
                    ) : null}
                    {onSaveVariant ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy || !dirty}
                        onClick={() => void saveVariant(v)}
                      >
                        {busy ? "Guardando…" : dirty ? "Guardar variante" : "Guardado"}
                      </button>
                    ) : null}
                  </div>
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
