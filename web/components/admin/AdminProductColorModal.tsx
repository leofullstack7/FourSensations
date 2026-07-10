"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AdminProduct } from "@/lib/types/admin";
import { isValidColorHex, normalizeColorHex } from "@/lib/product-color";

type Props = {
  open: boolean;
  product: AdminProduct | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: { colorHex: string | null; colorName: string | null }) => void | Promise<void>;
};

export function AdminProductColorModal({ open, product, saving, onClose, onSave }: Props) {
  const [mounted, setMounted] = useState(false);
  const [hexInput, setHexInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !product) return;
    setHexInput(product.colorHex ?? "");
    setNameInput(product.colorName ?? "");
    setError(null);
  }, [open, product]);

  if (!mounted || !open || !product) return null;

  const normalized = normalizeColorHex(hexInput);
  const previewHex = normalized ?? "#CCCCCC";

  const handleSave = () => {
    if (!hexInput.trim()) {
      void onSave({ colorHex: null, colorName: null });
      return;
    }
    if (!isValidColorHex(hexInput)) {
      setError("Ingresa un hexadecimal válido (ej. #C41E3A o C41E3A).");
      return;
    }
    setError(null);
    void onSave({
      colorHex: normalized,
      colorName: nameInput.trim() || null,
    });
  };

  return createPortal(
    <div
      className={`admin-modal-overlay admin-product-color-overlay${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
      role="presentation"
    >
      <div className="admin-modal admin-product-color-modal" style={{ maxWidth: 440 }}>
        <button
          type="button"
          className="modal-close admin-product-color-close"
          onClick={onClose}
          disabled={saving}
          aria-label="Cerrar"
        >
          ✕
        </button>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--dark)",
            marginBottom: 6,
          }}
        >
          Color del producto
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.45 }}>
          {product.name}
        </p>

        <div className="admin-product-color-preview">
          <span
            className="admin-product-color-preview__swatch"
            style={{ backgroundColor: previewHex }}
            aria-hidden
          />
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Vista previa</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{normalized ?? "Sin color"}</div>
            {nameInput.trim() ? (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{nameInput.trim()}</div>
            ) : null}
          </div>
        </div>

        <label className="form-label" style={{ display: "block", marginTop: 18 }}>
          Color (hexadecimal)
        </label>
        <div className="admin-product-color-input-row">
          <input
            type="color"
            className="admin-product-color-picker"
            value={normalized ? normalized : "#CCCCCC"}
            disabled={saving}
            onChange={(e) => {
              setHexInput(e.target.value.toUpperCase());
              setError(null);
            }}
            aria-label="Selector de color"
          />
          <input
            type="text"
            className="form-input"
            placeholder="#C41E3A"
            value={hexInput}
            disabled={saving}
            onChange={(e) => {
              setHexInput(e.target.value);
              setError(null);
            }}
          />
        </div>

        <label className="form-label" style={{ display: "block", marginTop: 14 }}>
          Nombre del color <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(opcional)</span>
        </label>
        <input
          type="text"
          className="form-input"
          placeholder="Ej. Rojo cereza"
          value={nameInput}
          disabled={saving}
          onChange={(e) => setNameInput(e.target.value)}
          style={{ width: "100%" }}
        />

        {error ? (
          <p style={{ color: "var(--dusty-rose)", fontSize: 12, marginTop: 10 }}>{error}</p>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Guardando…" : "Guardar color"}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            disabled={saving}
            onClick={() => {
              setHexInput("");
              setNameInput("");
              setError(null);
              void onSave({ colorHex: null, colorName: null });
            }}
          >
            Quitar color
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
