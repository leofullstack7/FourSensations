"use client";

import { StoreProductCard } from "@/components/store/store-product-card";
import {
  ProductColorSwatchField,
  variantsHaveColorSwatches,
} from "@/components/store/ProductColorSwatchField";
import type { StoreProduct } from "@/lib/types/product";

type ProductVariantsPickerModalProps = {
  open: boolean;
  variants: StoreProduct[];
  groupLabel?: string;
  favorites: string[];
  onSelect: (id: string) => void;
  onToggleFav: (id: string) => void;
  onAddCart: (id: string) => void;
  onClose: () => void;
};

export function ProductVariantsPickerModal({
  open,
  variants,
  groupLabel,
  favorites,
  onSelect,
  onToggleFav,
  onAddCart,
  onClose,
}: ProductVariantsPickerModalProps) {
  if (!open || variants.length === 0) return null;

  const title = groupLabel?.trim() || variants[0]?.name || "Producto";
  const showColorSwatches = variantsHaveColorSwatches(variants);

  return (
    <div
      className={`modal-overlay modal-overlay--variants-picker${open ? " open" : ""}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal modal--variants-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="variants-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close modal-close--tech" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        <div className="variants-picker-header">
          <span className="gb-tech-chip">Variantes disponibles</span>
          <h2 id="variants-picker-title" className="variants-picker-title">
            {title}
          </h2>
          <p className="variants-picker-subtitle">
            {showColorSwatches ? (
              <>
                Elige un <strong>color</strong> o una variante para ver el detalle completo.
              </>
            ) : (
              <>
                Este producto tiene <strong>{variants.length}</strong> variaciones. Elige la que necesitas para ver el
                detalle completo.
              </>
            )}
          </p>
        </div>

        {showColorSwatches ? (
          <div className="variants-picker-colors">
            <ProductColorSwatchField items={variants} onSelect={onSelect} size="md" />
          </div>
        ) : (
          <div className="variants-picker-grid">
            {variants.map((variant, i) => (
              <StoreProductCard
                key={variant.id}
                product={variant}
                isFav={favorites.includes(variant.id)}
                onOpen={onSelect}
                onToggleFav={onToggleFav}
                onAddCart={onAddCart}
                imagePriority={i < 4}
                compact
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
