"use client";

import { Suspense } from "react";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { formatPrice } from "@/lib/format";
import type { TintBubbleItem } from "@/lib/tints";
import { TintCategoryPageClient } from "./TintCategoryPageClient";

type TintCategoryPageBridgeProps = {
  initialItems: TintBubbleItem[];
  categoryLabel?: string;
  categoryIcon?: string;
};

function TintCategoryPageInner({
  initialItems,
  categoryLabel,
  categoryIcon,
}: TintCategoryPageBridgeProps) {
  const { addToCart, showToast } = useStorefrontUi();

  return (
    <TintCategoryPageClient
      initialItems={initialItems}
      categoryLabel={categoryLabel}
      categoryIcon={categoryIcon}
      formatPrice={formatPrice}
      addToCart={(item) => {
        addToCart(item.id);
        showToast(`${item.name} agregado al carrito`, "success", "🛒");
      }}
    />
  );
}

export function TintCategoryPageBridge({
  initialItems,
  categoryLabel,
  categoryIcon,
}: TintCategoryPageBridgeProps) {
  return (
    <Suspense
      fallback={<div className="tint-category-loading">Cargando tintes…</div>}
    >
      <TintCategoryPageInner
        initialItems={initialItems}
        categoryLabel={categoryLabel}
        categoryIcon={categoryIcon}
      />
    </Suspense>
  );
}
