"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

export const BULK_INVALID_PRICE_BATCH_THRESHOLD = 10;

type Props = {
  open: boolean;
  saving: boolean;
  rowCount: number;
  /** Progreso real reportado por el padre (productos ya actualizados). */
  appliedCount?: number;
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
  appliedCount = 0,
  onClose,
  onSkip,
  onApply,
}: Props) {
  const [digits, setDigits] = useState("");
  /** Busy local: se activa al instante al pulsar, sin esperar el re-render del padre. */
  const [busyLocal, setBusyLocal] = useState(false);
  const [displayDone, setDisplayDone] = useState(0);
  const applyingRef = useRef(false);

  const busy = busyLocal || saving;

  useEffect(() => {
    if (open && !busy) setDigits("");
  }, [open, busy]);

  useEffect(() => {
    if (!busy) {
      setDisplayDone(0);
      return;
    }
    const total = Math.max(1, rowCount);
    const tick = window.setInterval(() => {
      setDisplayDone((prev) => {
        const target = Math.min(total - 1, Math.max(prev, appliedCount));
        if (prev >= target) {
          const step = Math.max(1, Math.ceil(total / 50));
          return Math.min(total - 1, prev + step);
        }
        return Math.min(total - 1, target);
      });
    }, 90);
    return () => window.clearInterval(tick);
  }, [busy, rowCount, appliedCount]);

  useEffect(() => {
    if (busy && appliedCount > 0) {
      setDisplayDone((prev) => Math.max(prev, Math.min(rowCount, appliedCount)));
    }
  }, [appliedCount, busy, rowCount]);

  if (!open) return null;

  const price = digits ? Number.parseInt(digits, 10) : NaN;
  const canApply = Number.isFinite(price) && price >= 0 && !busy;
  const display = digits ? formatPrice(price) : "";
  const shownDone = busy ? Math.min(rowCount, Math.max(displayDone, appliedCount)) : 0;
  const pct = rowCount > 0 ? Math.round((shownDone / rowCount) * 100) : 0;

  return (
    <div
      className="admin-modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      role="presentation"
    >
      <div className="admin-modal" style={{ maxWidth: 520 }}>
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          disabled={busy}
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
            disabled={busy}
            onChange={(e) => setDigits(digitsFromInput(e.target.value).slice(0, 12))}
            style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}
          />
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Escribe solo números: <strong>10000</strong> se muestra como <strong>$10.000</strong>.
          </p>
        </div>

        {busy ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginBottom: 16,
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--dusty-rose)",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span className="admin-inline-spinner" aria-hidden />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--dark)" }}>
                Actualizando {shownDone} de {rowCount} productos…
              </div>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: "var(--cream, #f5ede3)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(4, pct)}%`,
                  borderRadius: 999,
                  background: "var(--dusty-rose)",
                  transition: "width 0.2s ease-out",
                }}
              />
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
              No cierres esta ventana. El servidor está guardando el precio en el preview.
            </p>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onSkip}>
            Continuar sin cambiar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canApply}
            onClick={() => {
              if (applyingRef.current || !canApply) return;
              applyingRef.current = true;
              setBusyLocal(true);
              setDisplayDone(0);
              void (async () => {
                try {
                  await onApply(price);
                  setDisplayDone(rowCount);
                } finally {
                  applyingRef.current = false;
                  setBusyLocal(false);
                }
              })();
            }}
          >
            {busy ? `Actualizando ${shownDone}/${rowCount}…` : `Poner ${display || "precio"} a ${rowCount}`}
          </button>
        </div>
      </div>
    </div>
  );
}
