"use client";

import { Suspense } from "react";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { formatPrice } from "@/lib/format";
import { TintCategoryPageClient } from "./TintCategoryPageClient";

type TintCategoryPageBridgeProps = {
  categoryLabel?: string;
  categoryIcon?: string;
  defaultSub?: string;
};

function TintCategoryPageInner({
  categoryLabel,
  categoryIcon,
  defaultSub,
}: TintCategoryPageBridgeProps) {
  const { addToCart, showToast } = useStorefrontUi();

  return (
    <TintCategoryPageClient
      categoryLabel={categoryLabel}
      categoryIcon={categoryIcon}
      defaultSub={defaultSub}
      formatPrice={formatPrice}
      addToCart={(item) => {
        addToCart(item.id);
        showToast(`${item.name} agregado al carrito`, "success", "🛒");
      }}
    />
  );
}

export function TintCategoryPageBridge({
  categoryLabel,
  categoryIcon,
  defaultSub,
}: TintCategoryPageBridgeProps) {
  return (
    <Suspense fallback={<div className="tint-category-loading">Cargando tintes…</div>}>
      <TintCategoryPageInner
        categoryLabel={categoryLabel}
        categoryIcon={categoryIcon}
        defaultSub={defaultSub}
      />
    </Suspense>
  );
}
