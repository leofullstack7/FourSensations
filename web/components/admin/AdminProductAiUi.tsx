"use client";

import type { ReactNode } from "react";
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

export function AdminProductDescriptionBlock({
  product,
  generating,
  onGenerate,
}: {
  product: AdminProduct;
  generating?: boolean;
  onGenerate?: () => void;
}) {
  const hasText = Boolean(product.description?.trim());
  const isAi = isAiGeneratedField(product, "description");

  return (
    <div className="admin-product-description-block">
      <div className="admin-product-description-block__head">
        <h3 className="admin-product-description-block__title">Descripción del producto</h3>
        <div className="admin-product-description-block__badges">
          {isAi ? <span className="admin-ai-cell admin-ai-cell--yes">Generada con IA</span> : null}
          {!isAi && hasText ? <span className="admin-ai-cell admin-ai-cell--no">Manual</span> : null}
          {!hasText ? <span className="admin-ai-cell admin-ai-cell--empty">Sin descripción</span> : null}
        </div>
      </div>
      {hasText ? (
        <div className="admin-product-description-block__body">{product.description}</div>
      ) : (
        <p className="admin-product-description-block__empty">
          Este producto no tiene descripción visible en tienda. Genera una con IA o edítala manualmente.
        </p>
      )}
      {onGenerate ? (
        <button
          type="button"
          className="btn btn-outline btn-sm admin-product-description-block__btn"
          disabled={generating}
          onClick={onGenerate}
        >
          {generating ? "Generando descripción…" : hasText ? "✨ Reescribir descripción comercial (IA)" : "✦ Generar descripción con IA"}
        </button>
      ) : null}
    </div>
  );
}

const FIELD_LABELS_DETAIL: Record<AiCompletableField, string> = {
  ...AI_FIELD_LABELS,
  tags: "Etiquetas del producto",
};

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
            let value: ReactNode = "—";
            if (field === "description") {
              value = product.description?.trim() ? (
                <span className="admin-ai-detail-desc-full">{product.description}</span>
              ) : (
                "—"
              );
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
