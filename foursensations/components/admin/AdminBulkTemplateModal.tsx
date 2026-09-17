"use client";

import { useState } from "react";
import {
  BULK_CSV_GENERAL_COLUMNS,
  BULK_CSV_TINTES_COLUMNS,
  downloadBulkExcelTemplate,
  type BulkCsvTemplateColumn,
  type BulkCsvTemplateKind,
} from "@/lib/bulk-import/csv-templates";

type Props = {
  open: boolean;
  onClose: () => void;
};

function ColumnTable({ columns }: { columns: BulkCsvTemplateColumn[] }) {
  return (
    <div className="admin-bulk-template-table-wrap">
      <table className="admin-table admin-bulk-template-table">
        <thead>
          <tr>
            <th>Columna</th>
            <th>¿Obligatoria?</th>
            <th>Descripción</th>
            <th>Ejemplo</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => (
            <tr key={col.header}>
              <td>
                <strong>{col.header}</strong>
                {col.aliases?.length ? (
                  <div className="admin-bulk-template-aliases">También: {col.aliases.join(", ")}</div>
                ) : null}
              </td>
              <td>{col.required ? "Sí" : "No"}</td>
              <td>{col.description}</td>
              <td>
                <code>{col.example}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminBulkTemplateModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<BulkCsvTemplateKind>("general");
  const [downloading, setDownloading] = useState(false);

  if (!open) return null;

  const columns = tab === "general" ? BULK_CSV_GENERAL_COLUMNS : BULK_CSV_TINTES_COLUMNS;

  const handleDownload = () => {
    setDownloading(true);
    void downloadBulkExcelTemplate(tab).finally(() => setDownloading(false));
  };

  return (
    <div
      className="admin-modal-overlay open"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className="admin-modal admin-bulk-template-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>

        <div className="admin-bulk-template-modal__title">📋 Plantillas de carga masiva</div>

        <div className="admin-bulk-template-csv-banner" role="alert">
          <span className="admin-bulk-template-csv-banner__icon" aria-hidden>
            ⚠️
          </span>
          <div>
            <strong>Descarga Excel · Sube CSV</strong>
            <p>
              Descarga la plantilla en <strong>Excel (.xlsx)</strong> para llenarla con comodidad. Cuando termines, en
              Excel elige <strong>Archivo → Guardar como → CSV UTF-8 (.csv)</strong>.{" "}
              <strong>El archivo que debes subir aquí es CSV, no Excel.</strong>
            </p>
          </div>
        </div>

        <div className="admin-bulk-template-tabs" role="tablist" aria-label="Tipo de plantilla">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "general"}
            className={`admin-bulk-template-tab${tab === "general" ? " active" : ""}`}
            onClick={() => setTab("general")}
          >
            Productos generales
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "tintes"}
            className={`admin-bulk-template-tab${tab === "tintes" ? " active" : ""}`}
            onClick={() => setTab("tintes")}
          >
            Tintes
          </button>
        </div>

        {tab === "general" ? (
          <p className="admin-bulk-template-intro">
            La plantilla Excel incluye columnas listas, filas de ejemplo y espacio para tus productos. Además del CSV
            necesitas un <strong>ZIP</strong> con imágenes cuyo nombre (sin extensión) coincida con la columna{" "}
            <strong>Código</strong>.
          </p>
        ) : (
          <p className="admin-bulk-template-intro">
            Plantilla opcional de taxonomía interna (no aparece en el menú público de Four Sensations). Las imágenes
            del ZIP deben coincidir con la columna <strong>Nivel</strong>. Tras analizar el CSV se pide tipo y familia.
          </p>
        )}

        <ColumnTable columns={columns} />

        <div className="admin-bulk-template-actions">
          <button type="button" className="btn btn-primary" disabled={downloading} onClick={handleDownload}>
            {downloading ? "Generando…" : `⬇️ Descargar Excel — ${tab === "general" ? "productos" : "tintes"}`}
          </button>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <p className="admin-bulk-template-footnote">
          La hoja «Instrucciones» del Excel resume cada columna. La primera fila de datos debe ser los encabezados.
          Máximo 500 filas · CSV ≤ 2&nbsp;MB · ZIP ≤ 50&nbsp;MB.
        </p>
      </div>
    </div>
  );
}
