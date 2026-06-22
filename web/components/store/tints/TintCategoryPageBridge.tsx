"use client";

import { Suspense } from "react";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { formatPrice } from "@/lib/format";
import type { TintBubbleItem } from "@/lib/tints";
import { TintCategoryPageClient } from "./TintCategoryPageClient";

function TintCategoryPageInner({ initialItems }: { initialItems: TintBubbleItem[] }) {
  const { addToCart, showToast } = useStorefrontUi();

  return (
    <TintCategoryPageClient
      initialItems={initialItems}
      formatPrice={formatPrice}
      addToCart={(item) => {
        addToCart(item.id);
        showToast(`${item.name} agregado al carrito`, "success", "🛒");
      }}
    />
  );
}

export function TintCategoryPageBridge({ initialItems }: { initialItems: TintBubbleItem[] }) {
  return (
    <Suspense
      fallback={<div className="tint-category-loading">Cargando tintes…</div>}
    >
      <TintCategoryPageInner initialItems={initialItems} />
    </Suspense>
  );
}
