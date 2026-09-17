"use client";

import { useEffect, useRef } from "react";
import { useStorefrontUi } from "@/components/store/storefront-ui-context";
import type { StoreProduct } from "@/lib/types/product";

/** Inyecta productos del servidor en el shell (p. ej. home) sin cargar todo el catálogo en el layout. */
export function StoreCatalogSeed({ products }: { products: StoreProduct[] }) {
  const { mergeCatalogProducts, markFullCatalogLoaded } = useStorefrontUi();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || products.length === 0) return;
    seeded.current = true;
    mergeCatalogProducts(products);
    markFullCatalogLoaded();
  }, [products, mergeCatalogProducts, markFullCatalogLoaded]);

  return null;
}
