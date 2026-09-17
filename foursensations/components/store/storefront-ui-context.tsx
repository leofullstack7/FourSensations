"use client";

import { createContext, useContext } from "react";
import type { MenuConfig } from "@/lib/types/admin";
import type { StoreProduct } from "@/lib/types/product";

export type StorefrontUiContextValue = {
  menuConfig: MenuConfig;
  categoryPath: (categoryDisplayName: string) => string;
  catalogProducts: StoreProduct[];
  mergeCatalogProducts: (extra: StoreProduct[]) => void;
  markFullCatalogLoaded: () => void;
  ensureFullCatalog: () => Promise<void>;
  showToast: (msg: string, type?: string, icon?: string) => void;
  openProductModal: (id: string) => void;
  closeProductModal: () => void;
  openSearch: () => void;
  openSearchWithQuery: (query: string) => void;
  openCart: () => void;
  openWishlist: () => void;
  openAccount: () => void;
  cartCount: number;
  /** `productSnapshot` evita fallar cuando el producto aún no está en el catálogo del shell (tintes, etc.). */
  addToCart: (id: string, productSnapshot?: StoreProduct) => void;
  addComboToCart: (combo: import("@/lib/types/store-combo").StoreCombo) => void;
  toggleFavorite: (id: string) => void;
  favorites: string[];
};

const StorefrontUiContext = createContext<StorefrontUiContextValue | null>(null);

export function useStorefrontUi(): StorefrontUiContextValue {
  const v = useContext(StorefrontUiContext);
  if (!v) {
    throw new Error("useStorefrontUi debe usarse dentro de StorefrontShell");
  }
  return v;
}

export { StorefrontUiContext };
