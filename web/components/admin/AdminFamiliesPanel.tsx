"use client";

import { useEffect, useState } from "react";
import type { AdminProductFamily } from "@/lib/types/admin-family";
import {
  createAdminFamily,
  deleteAdminFamily,
  fetchAdminFamilies,
  updateAdminFamily,
} from "@/lib/api/admin-families";

export function AdminFamiliesPanel({
  active,
  showToast,
  onFamiliesChanged,
}: {
  active: boolean;
  showToast: (msg: string, type?: string, icon?: string) => void;
  onFamiliesChanged?: () => void | Promise<void>;
}) {
  const [families, setFamilies] = useState<AdminProductFamily[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setFamilies(await fetchAdminFamilies());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar familias";
      setError(msg);
      showToast(msg, "danger", "⚠️");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const notifyChanged = async () => {
    await load();
    await onFamiliesChanged?.();
  };

  const createFamily = () => {
    const name = newName.trim();
    if (!name || busy) return;
    void (async () => {
      setBusy(true);
      try {
        const created = await createAdminFamily(name);
        setNewName("");
        showToast(`Familia «${created.name}» creada`, "success", "✅");
        await notifyChanged();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "No se pudo crear", "danger", "⚠️");
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)", maxWidth: 560, lineHeight: 1.5 }}>
        Catálogo de <strong>familias / marcas</strong>. Al asignar una familia a productos (en lote o al editar),
        se crea aquí si aún no existía. Renombrar actualiza también los productos que la usan.
      </p>

      {error ? (
        <div
          className="admin-card"
          style={{
            marginBottom: 16,
            padding: 14,
            background: "var(--lavender-light)",
            border: "1px solid var(--dusty-rose)",
            fontSize: 13,
          }}
        >
          <strong>Error:</strong> {error}{" "}
          <button type="button" className="btn btn-outline btn-sm" style={{ marginLeft: 8 }} onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : null}

      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title">Nueva familia</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          <div className="form-group" style={{ margin: 0, flex: "1 1 220px" }}>
            <label className="form-label">Nombre *</label>
            <input
              type="text"
              className="form-input"
              value={newName}
              disabled={busy}
              placeholder="Ej. Igora, Samy, GinnaBeauty…"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                createFamily();
              }}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !newName.trim()}
            onClick={createFamily}
          >
            {busy ? "Guardando…" : "Crear familia"}
          </button>
        </div>
      </div>

      <div className="admin-card admin-table-wrap" style={{ padding: 0 }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ padding: 14 }}>Familia</th>
              <th>Productos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && families.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>
                  Cargando…
                </td>
              </tr>
            ) : families.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>
                  Aún no hay familias. Crea una o asígnala desde un producto.
                </td>
              </tr>
            ) : (
              families.map((f) => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>
                    {editId === f.id ? (
                      <input
                        className="form-input"
                        value={editName}
                        disabled={busy}
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      f.name
                    )}
                  </td>
                  <td>{f.productCount}</td>
                  <td>
                    <div className="action-group">
                      {editId === f.id ? (
                        <>
                          <button
                            type="button"
                            className="btn-table"
                            disabled={busy || !editName.trim()}
                            onClick={() => {
                              const name = editName.trim();
                              if (!name) return;
                              void (async () => {
                                setBusy(true);
                                try {
                                  const updated = await updateAdminFamily(f.id, name);
                                  setEditId(null);
                                  showToast(`Familia renombrada a «${updated.name}»`, "success", "✅");
                                  await notifyChanged();
                                } catch (e) {
                                  showToast(e instanceof Error ? e.message : "No se pudo guardar", "danger", "⚠️");
                                } finally {
                                  setBusy(false);
                                }
                              })();
                            }}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="btn-table"
                            disabled={busy}
                            onClick={() => setEditId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn-table"
                            disabled={busy}
                            onClick={() => {
                              setEditId(f.id);
                              setEditName(f.name);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-table danger"
                            disabled={busy}
                            onClick={() => {
                              const extra =
                                f.productCount > 0
                                  ? ` Los ${f.productCount} producto(s) conservan el nombre de familia.`
                                  : "";
                              if (!confirm(`¿Eliminar la familia «${f.name}» del catálogo?${extra}`)) return;
                              void (async () => {
                                setBusy(true);
                                try {
                                  await deleteAdminFamily(f.id);
                                  showToast(`Familia «${f.name}» eliminada`, "default", "🗑️");
                                  await notifyChanged();
                                } catch (e) {
                                  showToast(e instanceof Error ? e.message : "No se pudo eliminar", "danger", "⚠️");
                                } finally {
                                  setBusy(false);
                                }
                              })();
                            }}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
