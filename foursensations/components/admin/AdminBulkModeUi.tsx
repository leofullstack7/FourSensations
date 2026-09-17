import type { BulkFieldDiff } from "@/lib/bulk-import/bulk-field-diff";

/** Celda con valor anterior (rojo) → nuevo (verde). */
export function BulkDiffCell({ diffs, field }: { diffs: BulkFieldDiff[]; field?: BulkFieldDiff["field"] }) {
  const list = field ? diffs.filter((d) => d.field === field) : diffs;
  if (list.length === 0) {
    return <span style={{ color: "var(--text-muted)" }}>—</span>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, lineHeight: 1.35 }}>
      {list.map((d) => (
        <div key={d.field} title={`${d.label}: ${d.before} → ${d.after}`}>
          {!field ? (
            <span style={{ color: "var(--text-muted)", marginRight: 4 }}>{d.label}:</span>
          ) : null}
          <span
            style={{
              color: "#b91c1c",
              textDecoration: "line-through",
              marginRight: 6,
              opacity: 0.9,
            }}
          >
            {truncate(d.before, 48)}
          </span>
          <span
            style={{
              color: "#15803d",
              fontWeight: 600,
              background: "rgba(22, 163, 74, 0.12)",
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            {truncate(d.after, 48)}
          </span>
        </div>
      ))}
    </div>
  );
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

export function BulkModePicker({
  onPick,
}: {
  onPick: (mode: "new" | "update") => void;
}) {
  return (
    <div className="admin-bulk-mode-picker">
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
        Elige el tipo de carga. El proceso y la pantalla cambian según la opción.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <button
          type="button"
          className="admin-bulk-mode-card"
          onClick={() => onPick("new")}
        >
          <span className="admin-bulk-mode-card__title">Cargar productos nuevos</span>
          <span className="admin-bulk-mode-card__desc">
            CSV + ZIP de imágenes. Solo verás filas listas (OK) para importar; las variantes se
            indican con un aviso breve.
          </span>
        </button>
        <button
          type="button"
          className="admin-bulk-mode-card"
          onClick={() => onPick("update")}
        >
          <span className="admin-bulk-mode-card__title">Actualizar productos existentes</span>
          <span className="admin-bulk-mode-card__desc">
            CSV con códigos ya en tienda. Compara valores y confirma cambios (rojo → verde) por
            fila o en lote.
          </span>
        </button>
      </div>
    </div>
  );
}
