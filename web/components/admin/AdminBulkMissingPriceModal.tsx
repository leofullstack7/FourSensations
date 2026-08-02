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

/** Extrae dígitos; conserva el 0 solo (no lo borra como «vacío»). */
function parseCopAmountInput(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;
  // "0", "00", "000" → 0; "01000" → 1000
  const normalized = digits.replace(/^0+(?=\d)/, "");
  const n = Number.parseInt(normalized.length ? normalized : "0", 10);
  return Number.isFinite(n) ? n : null;
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
  /** `null` = campo vacío; `0` = precio cero explícito. */
  const [amount, setAmount] = useState<number | null>(null);
  const [busyLocal, setBusyLocal] = useState(false);
  const [displayDone, setDisplayDone] = useState(0);
  const applyingRef = useRef(false);
  const wasOpenRef = useRef(false);

  const busy = busyLocal || saving;

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setAmount(null);
      setBusyLocal(false);
      setDisplayDone(0);
      applyingRef.current = false;
    }
    wasOpenRef.current = open;
  }, [open]);

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

  const canApply = amount !== null && amount >= 0 && !busy;
  const display = amount === null ? "" : formatPrice(amount);
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
          precio a todos ahora para quitar ese bloqueo de una vez. También puedes poner <strong>$0</strong>.
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
            placeholder="Ej. 10000 o 0"
            value={display}
            disabled={busy}
            onChange={(e) => setAmount(parseCopAmountInput(e.target.value))}
            style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}
          />
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Escribe números: <strong>10000</strong> → <strong>$10.000</strong>. El valor <strong>0</strong> se guarda
            como <strong>$0</strong>.
          </p>
          {amount !== null ? (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--dark)", fontWeight: 600 }}>
              Precio listo: {formatPrice(amount)}
              {amount === 0 ? " (gratis / cero)" : ""}
            </p>
          ) : null}
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
              if (applyingRef.current || amount === null || amount < 0) return;
              applyingRef.current = true;
              setBusyLocal(true);
              setDisplayDone(0);
              const priceToApply = amount;
              void (async () => {
                try {
                  await onApply(priceToApply);
                  setDisplayDone(rowCount);
                } finally {
                  applyingRef.current = false;
                  setBusyLocal(false);
                }
              })();
            }}
          >
            {busy
              ? `Actualizando ${shownDone}/${rowCount}…`
              : amount === null
                ? `Poner precio a ${rowCount}`
                : `Poner ${formatPrice(amount)} a ${rowCount}`}
          </button>
        </div>
      </div>
    </div>
  );
}
