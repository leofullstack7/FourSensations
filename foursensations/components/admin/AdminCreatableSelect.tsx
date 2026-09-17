"use client";

import { useEffect, useState } from "react";

export const CREATE_NEW_VALUE = "__create_new__";

type Option = { value: string; label: string };

/**
 * Select con última opción «crear nueva…».
 * El nombre nuevo se confirma con botón (nunca se aplica letra a letra).
 */
export function AdminCreatableSelect({
  label,
  value,
  options,
  onChange,
  createOptionLabel = "➕ Crear nueva…",
  newPlaceholder = "Escribe el nombre…",
  onCreate,
  disabled,
  emptyLabel = "Seleccionar…",
  allowEmpty = true,
  hint,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (next: string) => void;
  createOptionLabel?: string;
  newPlaceholder?: string;
  /** Si se pasa, crear implica API/async; debe devolver el valor a seleccionar. */
  onCreate?: (name: string) => Promise<string>;
  disabled?: boolean;
  emptyLabel?: string;
  allowEmpty?: boolean;
  hint?: string;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valueInOptions = options.some((o) => o.value === value);

  useEffect(() => {
    if (creating) return;
    if (!valueInOptions && value) {
      setCreating(true);
      setDraft(value);
    }
  }, [value, valueInOptions, creating]);

  const selectValue = creating ? CREATE_NEW_VALUE : value;

  return (
    <div className="form-group full-width">
      <label className="form-label">{label}</label>
      <select
        className="form-select"
        value={selectValue}
        disabled={disabled || busy}
        onChange={(e) => {
          const v = e.target.value;
          setError(null);
          if (v === CREATE_NEW_VALUE) {
            setCreating(true);
            setDraft("");
            setError(null);
            return;
          }
          setCreating(false);
          setDraft("");
          onChange(v);
        }}
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {!valueInOptions && value && !creating ? (
          <option value={value}>{value}</option>
        ) : null}
        <option value={CREATE_NEW_VALUE}>{createOptionLabel}</option>
      </select>

      {creating ? (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            className="form-input"
            value={draft}
            disabled={disabled || busy}
            placeholder={newPlaceholder}
            autoFocus
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={disabled || busy || !draft.trim()}
              onClick={() => {
                void (async () => {
                  const name = draft.trim();
                  if (!name) return;
                  setBusy(true);
                  setError(null);
                  try {
                    const created = onCreate ? await onCreate(name) : name;
                    setCreating(false);
                    setDraft("");
                    onChange(created);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "No se pudo crear");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              {busy ? "Creando…" : onCreate ? "Crear y usar" : "Usar este nombre"}
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              onClick={() => {
                setCreating(false);
                setDraft("");
                setError(null);
              }}
            >
              Cancelar
            </button>
          </div>
          {error ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--danger, #b42318)" }}>{error}</p>
          ) : null}
        </div>
      ) : null}
      {hint ? (
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{hint}</p>
      ) : null}
    </div>
  );
}

/** Chips de etiquetas: elegir de catálogo o crear nueva. */
export function AdminTagsCreatableField({
  label,
  value,
  catalogOptions,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  value: string[];
  catalogOptions: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const [pick, setPick] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  const selected = new Set(value.map((t) => t.toLowerCase()));
  const available = catalogOptions.filter((t) => !selected.has(t.toLowerCase()));

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (selected.has(tag.toLowerCase())) return;
    onChange([...value, tag]);
  }

  function removeTag(tag: string) {
    const key = tag.toLowerCase();
    onChange(value.filter((t) => t.toLowerCase() !== key));
  }

  return (
    <div className="form-group full-width">
      <label className="form-label">{label}</label>
      {value.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {value.map((t) => (
            <span
              key={t}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                border: "1px solid rgba(201, 145, 139, 0.45)",
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.9)",
              }}
            >
              {t}
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeTag(t)}
                aria-label={`Quitar ${t}`}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: disabled ? "wait" : "pointer",
                  padding: 0,
                  lineHeight: 1,
                  color: "var(--text-muted)",
                  fontSize: 14,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <select
        className="form-select"
        value={creating ? CREATE_NEW_VALUE : pick}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (v === CREATE_NEW_VALUE) {
            setCreating(true);
            setPick("");
            setDraft("");
            return;
          }
          setCreating(false);
          if (!v) return;
          addTag(v);
          setPick("");
        }}
      >
        <option value="">Añadir etiqueta…</option>
        {available.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        <option value={CREATE_NEW_VALUE}>➕ Crear etiqueta nueva…</option>
      </select>

      {creating ? (
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: "1 1 180px" }}
            value={draft}
            disabled={disabled}
            placeholder="Nueva etiqueta…"
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!draft.trim()) return;
                addTag(draft);
                setDraft("");
                setCreating(false);
              }
            }}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={disabled || !draft.trim()}
            onClick={() => {
              addTag(draft);
              setDraft("");
              setCreating(false);
            }}
          >
            Añadir
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={disabled}
            onClick={() => {
              setCreating(false);
              setDraft("");
            }}
          >
            Cancelar
          </button>
        </div>
      ) : null}
      {hint ? (
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{hint}</p>
      ) : null}
    </div>
  );
}
