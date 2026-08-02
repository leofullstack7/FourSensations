"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAdminVersionDetail,
  fetchAdminVersions,
  restoreAdminVersion,
  type CatalogVersionDetail,
  type CatalogVersionListItem,
} from "@/lib/api/admin-versions";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "CREATE":
      return "Creación";
    case "UPDATE":
      return "Actualización";
    case "DELETE":
      return "Eliminación";
    default:
      return action;
  }
}

function entityLabel(type: string): string {
  switch (type) {
    case "PRODUCT":
      return "Producto";
    case "CATEGORY":
      return "Categoría";
    case "SUBCATEGORY":
      return "Subcategoría";
    case "PRODUCT_COMBO":
      return "Combo";
    case "SITE_MENU":
      return "Menú";
    default:
      return type;
  }
}

export function AdminVersionsPanel({
  active,
  showToast,
  onCatalogMutated,
}: {
  active: boolean;
  showToast: (msg: string, type?: string, icon?: string) => void;
  /** Recarga productos/categorías en el admin tras restaurar. */
  onCatalogMutated?: () => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState(1);
  const [headVersionNumber, setHeadVersionNumber] = useState(1);
  const [versions, setVersions] = useState<CatalogVersionListItem[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [detail, setDetail] = useState<CatalogVersionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminVersions();
      setVersions(data.versions);
      setCurrentVersionNumber(data.currentVersionNumber);
      setHeadVersionNumber(data.headVersionNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar versiones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  const openDetail = useCallback(async (number: number) => {
    setSelectedNumber(number);
    setDetailLoading(true);
    try {
      const v = await fetchAdminVersionDetail(number);
      setDetail(v);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo cargar el detalle", "danger", "⚠️");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [showToast]);

  const handleRestore = useCallback(
    async (number: number) => {
      if (number === currentVersionNumber) {
        showToast("Esa ya es la versión activa", "default", "ℹ️");
        return;
      }
      const direction = number < currentVersionNumber ? "anterior" : "más reciente";
      if (
        !confirm(
          `¿Activar la versión ${number}?\n\nEsto aplicará los cambios para volver a esa versión ${direction}. Los cambios hechos después de restaurar crearán versiones nuevas.`,
        )
      ) {
        return;
      }
      setRestoring(number);
      try {
        const data = await restoreAdminVersion(number);
        setVersions(data.versions);
        setCurrentVersionNumber(data.currentVersionNumber);
        setHeadVersionNumber(data.headVersionNumber);
        showToast(`Versión ${number} activada`, "success", "✅");
        await onCatalogMutated?.();
        if (selectedNumber === number) {
          await openDetail(number);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : "No se pudo restaurar", "danger", "⚠️");
      } finally {
        setRestoring(null);
      }
    },
    [currentVersionNumber, onCatalogMutated, openDetail, selectedNumber, showToast],
  );

  return (
    <div>
      <div className="admin-card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Versiones del catálogo</h2>
            <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 13, maxWidth: 640 }}>
              Cada vez que agregas, editas o eliminas productos (también en carga masiva), se crea una versión nueva
              con una descripción de qué cambió respecto a la anterior. Puedes volver a una versión previa.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              style={{
                fontSize: 13,
                padding: "6px 12px",
                borderRadius: 999,
                background: "var(--lavender-light)",
                border: "1px solid var(--cream)",
              }}
            >
              Activa: <strong>v{currentVersionNumber}</strong>
              {currentVersionNumber !== headVersionNumber ? ` · Cabeza: v${headVersionNumber}` : ""}
            </span>
            <button type="button" className="btn btn-outline btn-sm" disabled={loading} onClick={() => void load()}>
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="admin-card" style={{ marginBottom: 16, padding: 14, background: "var(--lavender-light)", border: "1px solid var(--dusty-rose)", fontSize: 13 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && versions.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Cargando versiones…</p>
      ) : versions.length === 0 ? (
        <div className="admin-card" style={{ padding: 16, fontSize: 13, color: "var(--text-muted)" }}>
          Aún no hay versiones. Al crear o importar productos aparecerán aquí.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1.1fr)",
            gap: 16,
          }}
          className="admin-versions-grid"
        >
          <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--cream)", fontWeight: 600, fontSize: 14 }}>
              Historial
            </div>
            {versions.length === 1 && versions[0]?.isBaseline ? (
              <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45, borderBottom: "1px solid var(--cream)" }}>
                Solo está la versión inicial. Cuando agregues productos (manual o carga masiva) o edites el catálogo,
                verás aquí la descripción de lo que cambió.
              </div>
            ) : null}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 560, overflow: "auto" }}>
              {versions.map((v) => {
                const selected = selectedNumber === v.number;
                return (
                  <li key={v.id} style={{ borderBottom: "1px solid var(--cream)" }}>
                    <button
                      type="button"
                      onClick={() => void openDetail(v.number)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "12px 14px",
                        background: selected ? "var(--lavender-light)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <strong style={{ fontSize: 14 }}>v{v.number}</strong>
                        <span style={{ display: "flex", gap: 6 }}>
                          {v.isCurrent && (
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--dusty-rose)", color: "#fff" }}>
                              Activa
                            </span>
                          )}
                          {v.isBaseline && (
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--cream)" }}>
                              Inicial
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>{v.label}</div>
                      {v.summary ? (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginTop: 4,
                            lineHeight: 1.4,
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {v.summary}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        {formatDate(v.createdAt)}
                        {v.isBaseline ? "" : ` · ${v.changeCount} cambio${v.changeCount === 1 ? "" : "s"}`}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="admin-card" style={{ padding: 16, minHeight: 320 }}>
            {!selectedNumber && (
              <p style={{ color: "var(--text-muted)", margin: 0 }}>Selecciona una versión para ver qué cambió y activarla.</p>
            )}
            {detailLoading && <p style={{ color: "var(--text-muted)" }}>Cargando detalle…</p>}
            {!detailLoading && detail && (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 17 }}>Versión {detail.number}</h3>
                    <p style={{ margin: "6px 0 0", fontSize: 14 }}>{detail.label}</p>
                    {detail.summary && (
                      <p
                        style={{
                          margin: "10px 0 0",
                          fontSize: 13,
                          color: "var(--text)",
                          lineHeight: 1.5,
                          padding: "10px 12px",
                          background: "var(--lavender-light)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(199, 165, 178, 0.35)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        <strong style={{ display: "block", marginBottom: 4, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--dusty-rose)" }}>
                          Qué cambió respecto a la anterior
                        </strong>
                        {detail.summary}
                      </p>
                    )}
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                      {formatDate(detail.createdAt)}
                      {detail.createdBy ? ` · ${detail.createdBy}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-rose btn-sm"
                    disabled={detail.isCurrent || restoring !== null}
                    onClick={() => void handleRestore(detail.number)}
                  >
                    {detail.isCurrent
                      ? "Versión activa"
                      : restoring === detail.number
                        ? "Activando…"
                        : detail.number < currentVersionNumber
                          ? "Volver a esta versión"
                          : "Activar esta versión"}
                  </button>
                </div>

                <div style={{ marginTop: 18 }}>
                  <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Cambios en esta versión</h4>
                  {detail.isBaseline || detail.changes.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                      Esta es la baseline: representa el estado inicial del catálogo sin diffs.
                    </p>
                  ) : (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                      {detail.changes.map((c) => (
                        <li
                          key={c.id}
                          style={{
                            padding: "10px 12px",
                            border: "1px solid var(--cream)",
                            borderRadius: "var(--radius-md)",
                            fontSize: 13,
                          }}
                        >
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontWeight: 600 }}>{c.label || entityLabel(c.entityType)}</span>
                            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--lavender-light)" }}>
                              {actionLabel(c.action)}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{entityLabel(c.entityType)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
