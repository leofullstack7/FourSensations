"use client";

import { createContext, useContext } from "react";
import type { MenuConfig } from "@/lib/types/admin";
import type { StoreProduct } from "@/lib/types/product";

export type StorefrontUiContextValue = {
  menuConfig: MenuConfig;
  categoryPath: (categoryDisplayName: string) => string;
  catalogProducts: StoreProduct[];
  mergeCatalogProducts: (extra: StoreProduct[]) => void;
  ensureFullCatalog: () => Promise<void>;
  showToast: (msg: string, type?: string, icon?: string) => void;
  openProductModal: (id: string) => void;
  closeProductModal: () => void;
  openSearch: () => void;
  openSearchWithQuery: (query: string) => void;
  addToCart: (id: string) => void;
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
