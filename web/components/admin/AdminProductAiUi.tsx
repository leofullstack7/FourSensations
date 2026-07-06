"use client";

import type { AdminProduct } from "@/lib/types/admin";
import {
  AI_COMPLETABLE_FIELDS,
  AI_FIELD_LABELS,
  aiFieldListCell,
  getEmptyAiFields,
  isAiGeneratedField,
  productNeedsAiComplete,
  type AiCompletableField,
} from "@/lib/product-ai-fields";
import { productOwnTags } from "@/lib/product-tags";

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

const FIELD_LABELS_DETAIL: Record<AiCompletableField, string> = {
  ...AI_FIELD_LABELS,
  tags: "Etiquetas del producto",
};

export function AdminProductAiDetailPanel({ product }: { product: AdminProduct }) {
  const emptyFields = getEmptyAiFields(product);
  const hasAnyAi = AI_COMPLETABLE_FIELDS.some((f) => isAiGeneratedField(product, f));

  return (
    <div className="admin-ai-detail-panel">
      <div className="admin-ai-detail-panel__title">Datos enriquecidos con IA</div>
      <p className="admin-ai-detail-panel__hint">
        {hasAnyAi
          ? "Los campos marcados con Sí fueron generados automáticamente. Si los editas manualmente, dejan de contarse como IA."
          : productNeedsAiComplete(product)
            ? "Este producto aún tiene campos vacíos que puedes completar con IA desde la lista."
            : "Todos los campos IA están completos manualmente o por IA."}
      </p>
      {emptyFields.length > 0 && (
        <p className="admin-ai-detail-panel__hint" style={{ marginTop: -6 }}>
          Pendientes: {emptyFields.map((f) => FIELD_LABELS_DETAIL[f]).join(", ")}
        </p>
      )}
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
            let value = "—";
            if (field === "description") {
              value = product.description?.trim()
                ? product.description.slice(0, 120) + (product.description.length > 120 ? "…" : "")
                : "—";
            }
            if (field === "tags") {
              const tags = productOwnTags(product);
              value = tags.length ? tags.join(", ") : "—";
            }
            if (field === "emoji") value = product.emoji || "—";
            if (field === "badge") value = product.badge || "—";
            return (
              <tr key={field}>
                <td>{FIELD_LABELS_DETAIL[field]}</td>
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
