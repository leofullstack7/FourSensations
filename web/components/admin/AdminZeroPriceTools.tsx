"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminProduct } from "@/lib/types/admin";
import { formatPrice } from "@/lib/format";
import { postAdminProductsBulkPatch } from "@/lib/api/admin-products";

export function productsWithZeroPrice(products: AdminProduct[]): AdminProduct[] {
  return products
    .filter((p) => Number(p.price) === 0)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Modal: asignar la misma familia/marca a todos los productos con precio 0. */
export function AdminZeroPriceBrandModal({
  open,
  products,
  brandOptions,
  saving,
  onClose,
  onApplied,
  showToast,
}: {
  open: boolean;
  products: AdminProduct[];
  brandOptions: string[];
  saving: boolean;
  onClose: () => void;
  onApplied: () => void | Promise<void>;
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const zeroPrice = useMemo(() => productsWithZeroPrice(products), [products]);
  const [mode, setMode] = useState<"pick" | "custom">("pick");
  const [pickedBrand, setPickedBrand] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(brandOptions.length > 0 ? "pick" : "custom");
    setPickedBrand(brandOptions[0] ?? "");
    setCustomBrand("");
  }, [open, brandOptions]);

  if (!open) return null;

  const brand =
    mode === "custom" ? customBrand.trim() : pickedBrand.trim();

  const submit = () => {
    if (!brand) {
      showToast("Elige o escribe una familia/marca.", "default", "ℹ️");
      return;
    }
    if (zeroPrice.length === 0) {
      showToast("No hay productos con precio 0.", "default", "ℹ️");
      return;
    }
    void (async () => {
      setBusy(true);
      try {
        const res = await postAdminProductsBulkPatch({
          ids: zeroPrice.map((p) => p.id),
          brand,
        });
        showToast(
          `Familia/marca «${brand}» aplicada a ${res.updated} producto(s) con precio 0.`,
          "success",
          "✅"
        );
        await onApplied();
        onClose();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "No se pudo actualizar", "danger", "⚠️");
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div
      className="admin-modal-overlay open"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !saving) onClose();
      }}
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Cambiar familia o marca"
        style={{ maxWidth: 460, padding: "22px 20px" }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Cambiar familia / marca</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.45 }}>
          Se actualizará la familia/marca de{" "}
          <strong style={{ color: "var(--dusty-rose)" }}>{zeroPrice.length}</strong> producto(s) que
          tienen <strong>precio 0</strong>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            <input
              type="radio"
              name="zero-brand-mode"
              checked={mode === "pick"}
              disabled={brandOptions.length === 0}
              onChange={() => setMode("pick")}
            />
            Elegir una existente
          </label>
          <select
            className="form-select"
            disabled={mode !== "pick" || busy || brandOptions.length === 0}
            value={pickedBrand}
            onChange={(e) => setPickedBrand(e.target.value)}
          >
            {brandOptions.length === 0 ? (
              <option value="">— Sin marcas registradas —</option>
            ) : (
              brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))
            )}
          </select>

          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 4 }}>
            <input
              type="radio"
              name="zero-brand-mode"
              checked={mode === "custom"}
              onChange={() => setMode("custom")}
            />
            Escribir otra familia / marca
          </label>
          <input
            className="form-input"
            disabled={mode !== "custom" || busy}
            value={customBrand}
            placeholder="Ej. Igora, Samy, GinnaBeauty…"
            onChange={(e) => setCustomBrand(e.target.value)}
            onFocus={() => setMode("custom")}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || zeroPrice.length === 0 || !brand}
            onClick={submit}
          >
            {busy ? (
              <>
                <span className="admin-inline-spinner" aria-hidden />
                Aplicando…
              </>
            ) : (
              `Aplicar a ${zeroPrice.length}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Interfaz para asignar stock a productos con precio 0. */
export function AdminZeroPriceStockPanel({
  products,
  onBack,
  onApplied,
  showToast,
}: {
  products: AdminProduct[];
  onBack: () => void;
  onApplied: () => void | Promise<void>;
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const zeroPrice = useMemo(() => productsWithZeroPrice(products), [products]);
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [batchStock, setBatchStock] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of zeroPrice) {
      next[p.id] = String(p.stock ?? 0);
    }
    setDraftStock(next);
  }, [zeroPrice]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return zeroPrice;
    return zeroPrice.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.externalRef ?? "").toLowerCase().includes(q)
    );
  }, [zeroPrice, search]);

  const applyBatchToDraft = () => {
    const n = Number(batchStock);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      showToast("Ingresa un stock entero ≥ 0.", "default", "ℹ️");
      return;
    }
    setDraftStock((prev) => {
      const next = { ...prev };
      for (const p of visible) next[p.id] = String(n);
      return next;
    });
    showToast(`Stock ${n} listo en el borrador de ${visible.length} fila(s) visibles.`, "default", "✓");
  };

  const saveAll = () => {
    if (zeroPrice.length === 0) {
      showToast("No hay productos con precio 0.", "default", "ℹ️");
      return;
    }
    const stockById: Record<string, number> = {};
    for (const p of zeroPrice) {
      const raw = draftStock[p.id];
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        showToast(`Stock inválido en «${p.name}».`, "danger", "⚠️");
        return;
      }
      if (n !== Number(p.stock ?? 0)) stockById[p.id] = n;
    }
    const ids = Object.keys(stockById);
    if (ids.length === 0) {
      showToast("No hay cambios de stock para guardar.", "default", "ℹ️");
      return;
    }
    void (async () => {
      setBusy(true);
      try {
        const res = await postAdminProductsBulkPatch({ ids, stockById });
        showToast(`Stock actualizado en ${res.updated} producto(s).`, "success", "✅");
        await onApplied();
      } catch (e) {
        showToast(e instanceof Error ? e.message : "No se pudo guardar", "danger", "⚠️");
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className="admin-zero-price-stock">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <button type="button" className="btn btn-outline btn-sm" onClick={onBack} disabled={busy}>
            ← Volver a la lista
          </button>
          <h3 style={{ margin: "10px 0 4px", fontSize: 18 }}>Asignar stock · precio 0</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
            {zeroPrice.length} producto(s) con precio {formatPrice(0)}. Edita celda por celda o asigna un
            valor en lote.
          </p>
        </div>
        <button type="button" className="btn btn-primary" disabled={busy || zeroPrice.length === 0} onClick={saveAll}>
          {busy ? (
            <>
              <span className="admin-inline-spinner" aria-hidden />
              Guardando…
            </>
          ) : (
            "Guardar cambios de stock"
          )}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "flex-end",
          marginBottom: 14,
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid var(--cream)",
          background: "linear-gradient(135deg, #fffafc 0%, #f7f0ff 100%)",
        }}
      >
        <div className="form-group" style={{ margin: 0, flex: "1 1 160px" }}>
          <label className="form-label">Buscar</label>
          <input
            className="form-input"
            value={search}
            disabled={busy}
            placeholder="Nombre, marca o código…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0, flex: "0 1 140px" }}>
          <label className="form-label">Stock en lote</label>
          <input
            className="form-input"
            inputMode="numeric"
            value={batchStock}
            disabled={busy}
            placeholder="Ej. 10"
            onChange={(e) => setBatchStock(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn-outline"
          disabled={busy || visible.length === 0}
          onClick={applyBatchToDraft}
        >
          Asignar a visibles ({visible.length})
        </button>
      </div>

      <div className="admin-card admin-table-wrap" style={{ padding: 0 }}>
        <table className="admin-table admin-table--sticky-product">
          <thead>
            <tr>
              <th style={{ padding: 14 }}>Producto</th>
              <th>Marca</th>
              <th>Código</th>
              <th>Precio</th>
              <th style={{ width: 120 }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>
                  {zeroPrice.length === 0
                    ? "No hay productos con precio 0."
                    : "Ningún resultado con ese filtro."}
                </td>
              </tr>
            ) : (
              visible.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.brand || "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.externalRef || "—"}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td>
                    <input
                      className="form-input"
                      style={{ width: 96, minHeight: 36, padding: "6px 8px" }}
                      inputMode="numeric"
                      disabled={busy}
                      value={draftStock[p.id] ?? "0"}
                      onChange={(e) =>
                        setDraftStock((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      aria-label={`Stock de ${p.name}`}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
