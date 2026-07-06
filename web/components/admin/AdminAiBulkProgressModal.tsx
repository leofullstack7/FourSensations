"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminProduct } from "@/lib/types/admin";
import { AI_FIELD_LABELS, type AiCompletableField } from "@/lib/product-ai-fields";
import { productOwnTags } from "@/lib/product-tags";

export type AiBulkProgressItem = {
  id: string;
  name: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
  filled: AiCompletableField[];
  error?: string;
  product?: AdminProduct;
};

export type AiBulkProgressMode = "all" | "descriptions" | "descriptions-rewrite";

type AdminAiBulkProgressModalProps = {
  open: boolean;
  phase: "intro" | "running" | "done";
  mode: AiBulkProgressMode;
  items: AiBulkProgressItem[];
  onStart: () => void;
  onClose: () => void;
};

function modeTitle(mode: AiBulkProgressMode, phase: "intro" | "running" | "done"): string {
  if (mode === "descriptions-rewrite") {
    if (phase === "intro") return "Reescribir descripciones comerciales";
    if (phase === "running") return "Reescribiendo descripciones…";
    return "Reescritura finalizada";
  }
  if (mode === "descriptions") {
    if (phase === "intro") return "Descripciones con IA";
    if (phase === "running") return "Escribiendo descripciones…";
    return "Descripciones listas";
  }
  if (phase === "intro") return "Completar con IA";
  if (phase === "running") return "Ginna IA trabajando…";
  return "Proceso finalizado";
}

function modeIntroSubtitle(mode: AiBulkProgressMode, toProcess: number, total: number): string {
  if (mode === "descriptions-rewrite") {
    return `${toProcess} producto(s) por reescribir con copy comercial e-commerce`;
  }
  if (mode === "descriptions") {
    return `${toProcess} producto(s) sin descripción · ${total - toProcess} ya tienen texto`;
  }
  return `${toProcess} producto(s) por enriquecer · ${total - toProcess} ya completos`;
}

function modeIntroBody(mode: AiBulkProgressMode): string {
  if (mode === "descriptions-rewrite") {
    return "La IA tomará la descripción actual (o el nombre y categoría si falta texto) y redactará una versión más comercial, llamativa y orientada a venta, como en tiendas online de belleza.";
  }
  if (mode === "descriptions") {
    return "La IA redactará una descripción comercial clara para cada producto seleccionado que no tenga texto (mín. 12 caracteres).";
  }
  return "La IA completará descripción, etiquetas, emoji y badge donde falten. Verás cada producto actualizarse en tiempo real.";
}

function statusLabel(status: AiBulkProgressItem["status"], mode: AiBulkProgressMode): string {
  switch (status) {
    case "pending":
      return "En cola";
    case "running":
      return mode === "descriptions-rewrite" ? "Reescribiendo…" : "Generando…";
    case "done":
      return mode === "descriptions-rewrite" ? "Reescrito" : "Completado";
    case "skipped":
      return "Ya estaba completo";
    case "error":
      return "Error";
    default:
      return "";
  }
}

function ProductPreview({ product, filled }: { product: AdminProduct; filled: AiCompletableField[] }) {
  const tags = productOwnTags(product);
  return (
    <div className="admin-ai-progress-preview">
      {filled.includes("emoji") && product.emoji ? (
        <span className="admin-ai-progress-preview-emoji" aria-hidden>
          {product.emoji}
        </span>
      ) : null}
      {filled.includes("description") && product.description?.trim() ? (
        <p className="admin-ai-progress-preview-desc">
          {product.description.trim().slice(0, 100)}
          {product.description.length > 100 ? "…" : ""}
        </p>
      ) : null}
      {filled.includes("tags") && tags.length > 0 ? (
        <div className="admin-ai-progress-preview-tags">
          {tags.slice(0, 6).map((t) => (
            <span key={t} className="admin-ai-progress-tag">
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {filled.includes("badge") && product.badge ? (
        <span className="admin-ai-progress-badge">Badge: {product.badge}</span>
      ) : null}
    </div>
  );
}

export function AdminAiBulkProgressModal({
  open,
  phase,
  mode,
  items,
  onStart,
  onClose,
}: AdminAiBulkProgressModalProps) {
  const [visible, setVisible] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const t = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (phase !== "running" && phase !== "done") return;
    const el = listRef.current?.querySelector(".admin-ai-progress-item--running, .admin-ai-progress-item--done:last-child");
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [items, phase]);

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status === "pending" || i.status === "running").length;
    const done = items.filter((i) => i.status === "done").length;
    const skipped = items.filter((i) => i.status === "skipped").length;
    const errors = items.filter((i) => i.status === "error").length;
    const finished = total - pending;
    const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
    return { total, pending, done, skipped, errors, finished, pct };
  }, [items]);

  const toProcess = items.filter((i) => i.status !== "skipped").length;

  if (!open) return null;

  return (
    <div
      className={`admin-ai-progress-overlay${visible ? " admin-ai-progress-overlay--open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-ai-progress-title"
      onClick={(e) => {
        if (phase === "done" && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`admin-ai-progress-panel${visible ? " admin-ai-progress-panel--open" : ""}`}>
        <div className="admin-ai-progress-glow" aria-hidden />

        <header className="admin-ai-progress-header">
          <div className="admin-ai-progress-header-icon" aria-hidden>
            <span className="admin-ai-progress-spark">✦</span>
          </div>
          <div>
            <h2 id="admin-ai-progress-title" className="admin-ai-progress-title">
              {modeTitle(mode, phase)}
            </h2>
            <p className="admin-ai-progress-subtitle">
              {phase === "intro" && modeIntroSubtitle(mode, toProcess, items.length)}
              {phase === "running" && `${stats.finished} de ${stats.total} · ${stats.pct}%`}
              {phase === "done" &&
                `${stats.done} enriquecidos · ${stats.skipped} omitidos · ${stats.errors} con error`}
            </p>
          </div>
        </header>

        {(phase === "running" || phase === "done") && (
          <div className="admin-ai-progress-bar-wrap" aria-hidden>
            <div className="admin-ai-progress-bar-track">
              <div className="admin-ai-progress-bar-fill" style={{ width: `${stats.pct}%` }} />
            </div>
          </div>
        )}

        {phase === "intro" && (
          <div className="admin-ai-progress-intro">
            <p>{modeIntroBody(mode)}</p>
            <div className="admin-ai-progress-intro-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary btn-sm admin-ai-progress-start-btn" onClick={onStart}>
                Comenzar ahora
              </button>
            </div>
          </div>
        )}

        {(phase === "running" || phase === "done") && (
          <ul ref={listRef} className="admin-ai-progress-list" aria-live="polite" aria-relevant="additions text">
            {items.map((item, index) => (
              <li
                key={item.id}
                className={`admin-ai-progress-item admin-ai-progress-item--${item.status}`}
                style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
              >
                <div className="admin-ai-progress-item-main">
                  <span className="admin-ai-progress-item-status" aria-hidden>
                    {item.status === "running" && <span className="admin-ai-progress-spinner" />}
                    {item.status === "done" && "✓"}
                    {item.status === "skipped" && "○"}
                    {item.status === "error" && "!"}
                    {item.status === "pending" && "·"}
                  </span>
                  <div className="admin-ai-progress-item-copy">
                    <span className="admin-ai-progress-item-name">{item.name}</span>
                    <span className="admin-ai-progress-item-meta">{statusLabel(item.status, mode)}</span>
                  </div>
                </div>

                {item.status === "done" && item.filled.length > 0 && (
                  <div className="admin-ai-progress-fields">
                    {item.filled.map((field) => (
                      <span key={field} className="admin-ai-progress-field-chip">
                        {AI_FIELD_LABELS[field]}
                      </span>
                    ))}
                  </div>
                )}

                {item.status === "done" && item.product && item.filled.length > 0 && (
                  <ProductPreview product={item.product} filled={item.filled} />
                )}

                {item.status === "error" && item.error ? (
                  <p className="admin-ai-progress-item-error">{item.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {phase === "done" && (
          <footer className="admin-ai-progress-footer">
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              Cerrar
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
