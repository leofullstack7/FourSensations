"use client";

import type { AdminProduct } from "@/lib/types/admin";
import {
  AI_COMPLETABLE_FIELDS,
  AI_FIELD_LABELS,
  aiFieldListCell,
  isAiGeneratedField,
  type AiCompletableField,
} from "@/lib/product-ai-fields";

export function AdminAiFieldCell({
  product,
  field,
}: {
  product: Pick<AdminProduct, AiCompletableField | "aiGeneratedFields">;
  field: AiCompletableField;
}) {
  const state = aiFieldListCell(product, field);
  if (state === "si") {
    return <span className="admin-ai-cell admin-ai-cell--yes">Sí</span>;
  }
  if (state === "no") {
    return <span className="admin-ai-cell admin-ai-cell--no">No</span>;
  }
  return <span className="admin-ai-cell admin-ai-cell--empty">—</span>;
}

export function AdminProductAiDetailPanel({ product }: { product: AdminProduct }) {
  const hasAnyAi = AI_COMPLETABLE_FIELDS.some((f) => isAiGeneratedField(product, f));
  if (!hasAnyAi) return null;

  return (
    <div className="admin-ai-detail-panel">
      <div className="admin-ai-detail-panel__title">Datos completados con IA</div>
      <p className="admin-ai-detail-panel__hint">
        Los campos marcados con <strong>Sí</strong> fueron generados automáticamente según categoría y subcategoría.
        Si los editas manualmente, dejan de contarse como IA.
      </p>
      <table className="admin-ai-detail-table">
        <thead>
          <tr>
            <th>Atributo</th>
            <th>¿Generado con IA?</th>
            <th>Valor actual</th>
          </tr>
        </thead>
        <tbody>
          {AI_COMPLETABLE_FIELDS.map((field) => {
            const isAi = isAiGeneratedField(product, field);
            let value = "—";
            if (field === "description") value = product.description?.trim() ? product.description.slice(0, 120) + (product.description.length > 120 ? "…" : "") : "—";
            if (field === "tags") value = product.tags?.length ? product.tags.join(", ") : "—";
            if (field === "emoji") value = product.emoji || "—";
            if (field === "badge") value = product.badge || "—";
            return (
              <tr key={field}>
                <td>{AI_FIELD_LABELS[field]}</td>
                <td>
                  <AdminAiFieldCell product={product} field={field} />
                </td>
                <td className="admin-ai-detail-table__value">{value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
