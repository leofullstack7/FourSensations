"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import {
  fetchAdminAiSpendEvents,
  fetchAdminAiSpendSummary,
  patchAdminAiSpendTotal,
  type AiSpendEventItem,
  type AiSpendSummary,
} from "@/lib/api/admin-ai-spend";
import type { AiUsageKindKey } from "@/lib/ai-spend/pricing";

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function AdminAiSpendStatCard({
  showToast,
}: {
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const [summary, setSummary] = useState<AiSpendSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedKind, setSelectedKind] = useState<AiUsageKindKey | null>(null);
  const [events, setEvents] = useState<AiSpendEventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminAiSpendSummary();
      setSummary(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al cargar gasto IA", "danger", "⚠️");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openModal = () => {
    setOpen(true);
    setSelectedKind(null);
    setEvents([]);
    setMenuOpen(false);
    setUnlockOpen(false);
    setPassword("");
    void load();
  };

  const openKind = async (kind: AiUsageKindKey) => {
    setSelectedKind(kind);
    setEventsLoading(true);
    try {
      setEvents(await fetchAdminAiSpendEvents(kind));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al cargar fechas", "danger", "⚠️");
    } finally {
      setEventsLoading(false);
    }
  };

  const submitOverride = async () => {
    if (!summary) return;
    const target = Number(editTotal.replace(/[^\d]/g, ""));
    if (!Number.isFinite(target)) {
      showToast("Ingresa un total válido", "default", "ℹ️");
      return;
    }
    setSaving(true);
    try {
      const next = await patchAdminAiSpendTotal({ password, targetTotalCop: target });
      setSummary(next);
      setUnlockOpen(false);
      setMenuOpen(false);
      setPassword("");
      showToast(
        next.versionNumber
          ? `Total actualizado · registrado en Versiones (v${next.versionNumber})`
          : "Total actualizado",
        "success",
        "✓"
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="stat-card stat-card--tech admin-ai-spend-card"
        onClick={openModal}
        title="Ver detalle del gasto en IA"
      >
        <div className="stat-icon">🤖</div>
        <div className="stat-num">
          {loading && !summary ? "…" : formatPrice(summary?.displayTotalCop ?? 0)}
        </div>
        <div className="stat-label">Gastado en IA</div>
        <div className="stat-trend up">Clic para ver detalle por función</div>
      </button>

      {open ? (
        <div
          className="admin-modal-overlay open"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Gasto en IA"
            style={{ maxWidth: 520, padding: "22px 20px", position: "relative" }}
          >
            <button
              type="button"
              className="admin-ai-spend-menu-dots"
              aria-label="Opciones avanzadas"
              title="Opciones"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ···
            </button>
            {menuOpen ? (
              <div className="admin-ai-spend-menu-pop">
                <button
                  type="button"
                  onClick={() => {
                    setUnlockOpen(true);
                    setMenuOpen(false);
                    setEditTotal(String(summary?.displayTotalCop ?? 0));
                    setPassword("");
                  }}
                >
                  Modificar total (admin)
                </button>
              </div>
            ) : null}

            <h3 style={{ margin: "0 0 6px", fontSize: 18, paddingRight: 36 }}>Gasto en IA</h3>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)" }}>
              Total acumulado:{" "}
              <strong style={{ color: "var(--dusty-rose)" }}>
                {formatPrice(summary?.displayTotalCop ?? 0)}
              </strong>
            </p>

            {unlockOpen ? (
              <div
                style={{
                  marginBottom: 14,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid var(--cream)",
                  background: "var(--ivory, #faf7f5)",
                }}
              >
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--text-muted)" }}>
                  Clave de administrador para ajustar el contador. El cambio queda en Versiones.
                </p>
                <input
                  className="form-input"
                  type="password"
                  placeholder="Clave"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <input
                  className="form-input"
                  inputMode="numeric"
                  placeholder="Nuevo total en pesos"
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setUnlockOpen(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={saving}
                    onClick={() => void submitOverride()}
                  >
                    {saving ? "Guardando…" : "Guardar total"}
                  </button>
                </div>
              </div>
            ) : null}

            {selectedKind ? (
              <div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ marginBottom: 10 }}
                  onClick={() => setSelectedKind(null)}
                >
                  ← Volver a funciones
                </button>
                <h4 style={{ margin: "0 0 8px", fontSize: 14 }}>
                  {summary?.byKind.find((k) => k.kind === selectedKind)?.label ?? selectedKind}
                </h4>
                {eventsLoading ? (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando fechas…</p>
                ) : events.length === 0 ? (
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sin registros aún.</p>
                ) : (
                  <ul className="admin-ai-spend-event-list">
                    {events.map((ev) => (
                      <li key={ev.id}>
                        <span>{formatEventDate(ev.createdAt)}</span>
                        <strong>{formatPrice(ev.amountCop)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="admin-ai-spend-kind-list">
                {(summary?.byKind ?? []).map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    className="admin-ai-spend-kind-row"
                    onClick={() => void openKind(k.kind)}
                    disabled={k.count === 0}
                  >
                    <span className="admin-ai-spend-kind-row__label">
                      {k.label}
                      <small>
                        {k.count} uso(s) · {formatPrice(k.unitPriceCop)} c/u
                      </small>
                    </span>
                    <span className="admin-ai-spend-kind-row__total">{formatPrice(k.totalCop)}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
