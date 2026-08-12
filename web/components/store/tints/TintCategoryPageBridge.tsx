"use client";

import { Suspense } from "react";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import { formatPrice } from "@/lib/format";
import { TINTES_CATEGORY_SLUG } from "@/lib/bulk-import/tintes";
import type { TintBubbleItem } from "@/lib/tints";
import type { StoreProduct } from "@/lib/types/product";
import { TintCategoryPageClient } from "./TintCategoryPageClient";

type TintCategoryPageBridgeProps = {
  categoryLabel?: string;
  categoryIcon?: string;
  defaultSub?: string;
};

function tintBubbleToStoreProduct(item: TintBubbleItem): StoreProduct {
  const gallery = [item.mainImageUrl, item.colorImageUrl].filter(Boolean);
  return {
    id: item.id,
    name: item.name,
    brand: item.family?.trim() || "GinnaBeauty",
    category: TINTES_CATEGORY_SLUG,
    subcategory: item.subcategory?.trim() || "",
    tags: [],
    price: item.price,
    originalPrice: null,
    discountPercent: null,
    rating: 5,
    reviews: 0,
    badge: null,
    description: [item.level && `Nivel ${item.level}`, item.type, item.family]
      .filter(Boolean)
      .join(" · "),
    img: item.mainImageUrl || item.colorImageUrl || "",
    emoji: "🎨",
    isNew: false,
    featuredInHome: false,
    gallery,
    tintLevel: item.level ?? undefined,
    tintGroup: item.group ?? undefined,
    tintFamily: item.family ?? undefined,
    tintType: item.type ?? undefined,
  };
}

function TintCategoryPageInner({
  categoryLabel,
  categoryIcon,
  defaultSub,
}: TintCategoryPageBridgeProps) {
  const { addToCart } = useStorefrontUi();

  return (
    <TintCategoryPageClient
      categoryLabel={categoryLabel}
      categoryIcon={categoryIcon}
      defaultSub={defaultSub}
      formatPrice={formatPrice}
      addToCart={(item) => {
        addToCart(item.id, tintBubbleToStoreProduct(item));
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
