"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type CategoryNavFilters = {
  grupo: string;
  sub: string;
  tag: string;
};

type StoreNavigationContextValue = {
  isNavigating: boolean;
  navigateTo: (href: string) => void;
  /** Filtros aplicados al instante sin recarga de servidor (misma ruta). */
  categoryNavFilters: CategoryNavFilters | null;
};

const StoreNavigationContext = createContext<StoreNavigationContextValue | null>(null);

export function useStoreNavigation(): StoreNavigationContextValue {
  const ctx = useContext(StoreNavigationContext);
  if (!ctx) {
    throw new Error("useStoreNavigation debe usarse dentro de StoreNavigationProvider");
  }
  return ctx;
}

function normalizeHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function hrefKey(pathname: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function parseHref(href: string): { pathname: string; search: string } {
  const [pathname, search = ""] = href.split("?");
  return { pathname, search };
}

function filtersFromSearch(search: string): CategoryNavFilters {
  const qs = new URLSearchParams(search);
  return {
    grupo: qs.get("grupo")?.trim() ?? "",
    sub: qs.get("sub")?.trim() ?? "",
    tag: qs.get("tag")?.trim() ?? "",
  };
}

export function StoreNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [categoryNavFilters, setCategoryNavFilters] = useState<CategoryNavFilters | null>(null);

  const navigateTo = useCallback(
    (href: string) => {
      const target = normalizeHref(href);
      const current = hrefKey(pathname, searchParams);

      if (target === current) return;

      const { pathname: targetPath, search: targetSearch } = parseHref(target);

      if (targetPath === pathname) {
        setCategoryNavFilters(filtersFromSearch(targetSearch));
        window.history.replaceState(null, "", target);
        return;
      }

      router.push(target);
    },
    [pathname, searchParams, router],
  );

  useEffect(() => {
    setCategoryNavFilters(null);
  }, [pathname]);

  return (
    <StoreNavigationContext.Provider value={{ isNavigating: false, navigateTo, categoryNavFilters }}>
      {children}
    </StoreNavigationContext.Provider>
  );
}
