"use client";

import type { StoreProduct } from "@/lib/types/product";
import { normalizeColorHex } from "@/lib/product-color";

type SwatchItem = Pick<StoreProduct, "id" | "colorHex" | "colorName" | "name">;

type Props = {
  items: SwatchItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  size?: "sm" | "md";
  className?: string;
};

export function ProductColorSwatchField({
  items,
  selectedId = null,
  onSelect,
  size = "md",
  className = "",
}: Props) {
  const withColor = items.filter((item) => normalizeColorHex(item.colorHex));
  if (withColor.length === 0) return null;

  return (
    <div
      className={`product-color-swatches product-color-swatches--${size}${className ? ` ${className}` : ""}`}
      role="listbox"
      aria-label="Colores disponibles"
    >
      {withColor.map((item) => {
        const hex = normalizeColorHex(item.colorHex)!;
        const isActive = selectedId === item.id;
        const label = item.colorName?.trim() || item.name;
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={isActive}
            className={`product-color-swatch${isActive ? " product-color-swatch--active" : ""}`}
            onClick={() => onSelect(item.id)}
            title={label}
          >
            <span className="product-color-swatch__halo" aria-hidden="true" />
            <span
              className="product-color-swatch__circle"
              style={{ backgroundColor: hex }}
              aria-hidden="true"
            />
            {item.colorName?.trim() ? (
              <span className="product-color-swatch__label">{item.colorName.trim()}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function productHasColorSwatch(item: Pick<StoreProduct, "colorHex">): boolean {
  return normalizeColorHex(item.colorHex) != null;
}

export function variantsHaveColorSwatches(items: Pick<StoreProduct, "colorHex">[]): boolean {
  return items.some((item) => productHasColorSwatch(item));
}
