"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";

export const BULK_INVALID_PRICE_BATCH_THRESHOLD = 10;

type Props = {
  open: boolean;
  saving: boolean;
  rowCount: number;
  onClose: () => void;
  onSkip: () => void;
  onApply: (price: number) => Promise<void>;
};

function digitsFromInput(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function AdminBulkMissingPriceModal({
  open,
  saving,
  rowCount,
  onClose,
  onSkip,
  onApply,
}: Props) {
  const [digits, setDigits] = useState("");

  useEffect(() => {
    if (open) setDigits("");
  }, [open]);

  if (!open) return null;

  const price = digits ? Number.parseInt(digits, 10) : NaN;
  const canApply = Number.isFinite(price) && price > 0 && !saving;
  const display = digits ? formatPrice(price) : "";

  return (
    <div
      className="admin-modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="presentation"
    >
      <div className="admin-modal" style={{ maxWidth: 520 }}>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={saving}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--dark)",
            marginBottom: 8,
          }}
        >
          Precio faltante en lote
        </div>
        <p style={{ marginTop: 0, marginBottom: 14, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.55 }}>
          Hay <strong>{rowCount}</strong> productos con estado «Precio inválido o vacío». Puedes asignar el mismo
          precio a todos ahora para quitar ese bloqueo de una vez.
        </p>

        <div
          style={{
            marginBottom: 18,
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--lavender-light) 0%, #fff8f6 100%)",
            border: "1px solid rgba(199, 165, 178, 0.45)",
          }}
        >
          <label className="form-label" htmlFor="bulk-missing-price-input" style={{ display: "block", marginBottom: 6 }}>
            Precio para todos (COP)
          </label>
          <input
            id="bulk-missing-price-input"
            className="form-input"
            inputMode="numeric"
            autoFocus
            placeholder="$0"
            value={display}
            disabled={saving}
            onChange={(e) => setDigits(digitsFromInput(e.target.value).slice(0, 12))}
            style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}
          />
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Escribe solo números: <strong>10000</strong> se muestra como <strong>$10.000</strong>.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" disabled={saving} onClick={onSkip}>
            Continuar sin cambiar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canApply}
            onClick={() => {
              void onApply(price);
            }}
          >
            {saving ? "Aplicando…" : `Poner ${display || "precio"} a ${rowCount}`}
          </button>
        </div>
      </div>
    </div>
  );
}
