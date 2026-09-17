"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import { loadZipImageObjectUrl } from "@/lib/bulk-import/zip-client-image";
import { AdminBulkImageLightbox } from "@/components/admin/AdminBulkMatchedImages";

export type BulkRowEditDraft = {
  name: string;
  description: string;
  price: string;
  stock: string;
  categorySlug: string;
  subcategoryName: string;
  subcategoryMode: "existing" | "new";
  subcategoryCustom: string;
};

export type BulkRowEditSavePayload = {
  name: string;
  description: string;
  price: number | null;
  stock: number | null;
  categorySlug: string;
  subcategoryName: string;
};

type MatchedImage = {
  imageFilename: string;
  matchedBy?: string;
};

type Props = {
  open: boolean;
  saving: boolean;
  zipFile: File | null;
  categories: AdminCategoryTree[];
  row: {
    previewRowId: string;
    codeValue: string | null;
    nameValue: string | null;
    descriptionValue: string | null;
    priceValue: number | null;
    stockValue: number | null;
    categorySlug: string | null;
    subcategoryValue: string | null;
    matchedImages: MatchedImage[];
    errors: string[];
    hasExisting: boolean;
  } | null;
  onClose: () => void;
  onSave: (payload: BulkRowEditSavePayload) => Promise<void>;
};

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/(^|[\s\-/])(\S)/g, (_m, sep, ch) => sep + (ch as string).toUpperCase());
}

export function AdminBulkRowEditModal({
  open,
  saving,
  zipFile,
  categories,
  row,
  onClose,
  onSave,
}: Props) {
  const sortedCats = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const [draft, setDraft] = useState<BulkRowEditDraft>({
    name: "",
    description: "",
    price: "",
    stock: "",
    categorySlug: "",
    subcategoryName: "",
    subcategoryMode: "existing",
    subcategoryCustom: "",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    const fallbackCategory = row.categorySlug ?? sortedCats[0]?.slug ?? "";
    const cat = sortedCats.find((c) => c.slug === fallbackCategory);
    const existingSub = row.subcategoryValue?.trim() ?? "";
    const subInCat = cat?.subcategories.some((s) => s.name === existingSub);
    setDraft({
      name: row.nameValue ?? "",
      description: row.descriptionValue ?? "",
      price: row.priceValue != null ? String(row.priceValue) : "",
      stock: row.stockValue != null ? String(row.stockValue) : "0",
      categorySlug: fallbackCategory,
      subcategoryName: existingSub || cat?.subcategories?.[0]?.name || "",
      subcategoryMode: existingSub && !subInCat ? "new" : "existing",
      subcategoryCustom: existingSub && !subInCat ? existingSub : "",
    });
  }, [open, row, sortedCats]);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;

    async function load() {
      setImageUrl(null);
      if (!open || !row || !zipFile) return;
      const fileName = row.matchedImages[0]?.imageFilename;
      if (!fileName) return;
      setImageLoading(true);
      try {
        const url = await loadZipImageObjectUrl(zipFile, fileName);
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        revoked = url;
        setImageUrl(url);
      } catch {
        if (!cancelled) setImageUrl(null);
      } finally {
        if (!cancelled) setImageLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [open, row, zipFile]);

  const subcategoryOptions = useMemo(() => {
    const cat = sortedCats.find((c) => c.slug === draft.categorySlug);
    return cat ? [...cat.subcategories].sort((a, b) => a.sortOrder - b.sortOrder) : [];
  }, [sortedCats, draft.categorySlug]);

  const effectiveSubcategory =
    draft.subcategoryMode === "new" ? toTitleCase(draft.subcategoryCustom) : draft.subcategoryName;

  const priceNum = draft.price.trim() === "" ? null : Number(draft.price.replace(",", "."));
  const stockNum = draft.stock.trim() === "" ? null : Number.parseInt(draft.stock, 10);
  const priceValid = priceNum == null || (Number.isFinite(priceNum) && priceNum >= 0);
  const stockValid = stockNum == null || (Number.isInteger(stockNum) && stockNum >= 0);

  const canSave =
    !!draft.categorySlug &&
    !!effectiveSubcategory.trim() &&
    priceValid &&
    stockValid &&
    !saving;

  if (!open || !row) return null;

  return (
    <div
      className="admin-modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="presentation"
    >
      <div
        className="admin-modal"
        style={{
          maxWidth: 880,
          width: "min(920px, 96vw)",
          maxHeight: "92vh",
          overflow: "auto",
          padding: 0,
        }}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={saving}
          aria-label="Cerrar"
          style={{ zIndex: 2 }}
        >
          ✕
        </button>

        <div
          style={{
            padding: "22px 26px 12px",
            borderBottom: "1px solid var(--line, #e7d9d4)",
            background: "linear-gradient(135deg, #fff8f6 0%, #fff 55%)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dusty-rose)",
            }}
          >
            Editar producto del match
          </p>
          <h2 style={{ margin: "6px 0 4px", fontSize: 22, fontWeight: 700, color: "var(--dark)" }}>
            {draft.name.trim() || "Sin nombre"}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", fontFamily: "monospace" }}>
            Código: {row.codeValue ?? "—"}
            {row.hasExisting ? " · Ya registrado en tienda" : ""}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 280px) 1fr",
            gap: 0,
          }}
          className="admin-bulk-row-edit-grid"
        >
          <aside
            style={{
              padding: 22,
              background: "linear-gradient(180deg, #faf6f4 0%, #fff 100%)",
              borderRight: "1px solid var(--line, #e7d9d4)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                aspectRatio: "1",
                borderRadius: 14,
                overflow: "hidden",
                background: "#fff",
                border: "1px solid var(--line, #e7d9d4)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 8px 24px rgba(80, 40, 40, 0.06)",
              }}
            >
              {imageLoading ? (
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando imagen…</span>
              ) : imageUrl ? (
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  title="Ampliar imagen"
                  style={{
                    width: "100%",
                    height: "100%",
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "zoom-in",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={row.matchedImages[0]?.imageFilename ?? "Producto"}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: 16, color: "var(--text-muted)", fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🖼️</div>
                  Sin imagen emparejada
                </div>
              )}
            </div>
            {lightboxOpen && imageUrl ? (
              <AdminBulkImageLightbox
                src={imageUrl}
                alt={row.matchedImages[0]?.imageFilename ?? "Producto"}
                onClose={() => setLightboxOpen(false)}
              />
            ) : null}
            {row.matchedImages[0]?.imageFilename ? (
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all" }}>
                {row.matchedImages[0].imageFilename}
                {row.matchedImages[0].matchedBy ? ` · ${row.matchedImages[0].matchedBy}` : ""}
              </p>
            ) : null}
            {row.errors.length > 0 ? (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(176, 0, 32, 0.06)",
                  border: "1px solid rgba(176, 0, 32, 0.2)",
                  fontSize: 12,
                  color: "#8a1028",
                  lineHeight: 1.4,
                }}
              >
                <strong>Estado:</strong> {row.errors[0]}
                {row.errors.length > 1 ? ` (+${row.errors.length - 1})` : ""}
              </div>
            ) : null}
          </aside>

          <div style={{ padding: "22px 26px 26px", display: "grid", gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Nombre</label>
              <input
                className="form-input"
                value={draft.name}
                disabled={saving}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Descripción</label>
              <textarea
                className="form-input"
                rows={4}
                value={draft.description}
                disabled={saving}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                style={{ resize: "vertical", minHeight: 96 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Precio</label>
                <input
                  className="form-input"
                  inputMode="decimal"
                  value={draft.price}
                  disabled={saving}
                  onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                />
                {!priceValid ? (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--danger, #b00020)" }}>
                    Precio inválido
                  </p>
                ) : null}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Stock</label>
                <input
                  className="form-input"
                  inputMode="numeric"
                  value={draft.stock}
                  disabled={saving}
                  onChange={(e) => setDraft((d) => ({ ...d, stock: e.target.value }))}
                />
                {!stockValid ? (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--danger, #b00020)" }}>
                    Stock inválido
                  </p>
                ) : null}
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={draft.categorySlug}
                disabled={saving || sortedCats.length === 0}
                onChange={(e) => {
                  const slug = e.target.value;
                  const cat = sortedCats.find((c) => c.slug === slug);
                  setDraft((d) => ({
                    ...d,
                    categorySlug: slug,
                    subcategoryMode: "existing",
                    subcategoryCustom: "",
                    subcategoryName: cat?.subcategories?.[0]?.name ?? "",
                  }));
                }}
              >
                {sortedCats.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Subcategoría</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, fontSize: 11.5 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${draft.subcategoryMode === "existing" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setDraft((d) => ({ ...d, subcategoryMode: "existing" }))}
                  disabled={saving}
                >
                  Existente
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${draft.subcategoryMode === "new" ? "btn-primary" : "btn-outline"}`}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      subcategoryMode: "new",
                      subcategoryCustom: d.subcategoryCustom || d.subcategoryName,
                    }))
                  }
                  disabled={saving}
                >
                  + Nueva
                </button>
              </div>
              {draft.subcategoryMode === "existing" ? (
                <select
                  className="form-select"
                  value={draft.subcategoryName}
                  disabled={saving || subcategoryOptions.length === 0}
                  onChange={(e) => setDraft((d) => ({ ...d, subcategoryName: e.target.value }))}
                >
                  {subcategoryOptions.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="form-input"
                  placeholder="Ej: Cuero Cabelludo"
                  value={draft.subcategoryCustom}
                  disabled={saving}
                  onChange={(e) => setDraft((d) => ({ ...d, subcategoryCustom: e.target.value }))}
                  onBlur={(e) =>
                    setDraft((d) => ({ ...d, subcategoryCustom: toTitleCase(e.target.value) }))
                  }
                />
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
              <button type="button" className="btn btn-outline" disabled={saving} onClick={onClose}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canSave}
                onClick={() => {
                  void onSave({
                    name: draft.name.trim(),
                    description: draft.description.trim(),
                    price: priceNum,
                    stock: stockNum,
                    categorySlug: draft.categorySlug,
                    subcategoryName: effectiveSubcategory.trim(),
                  });
                }}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 720px) {
            .admin-bulk-row-edit-grid {
              grid-template-columns: 1fr !important;
            }
            .admin-bulk-row-edit-grid > aside {
              border-right: none !important;
              border-bottom: 1px solid var(--line, #e7d9d4);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
