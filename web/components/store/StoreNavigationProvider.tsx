"use client";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

const CATEGORY_NAV_DELAY_MS = 2000;

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

function isCategoryHref(href: string): boolean {
  const { pathname } = parseHref(normalizeHref(href));
  return pathname.startsWith("/categoria/");
}

export function StoreNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [categoryNavFilters, setCategoryNavFilters] = useState<CategoryNavFilters | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHrefRef = useRef<string | null>(null);

  const clearNavTimer = useCallback(() => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      const target = normalizeHref(href);
      const current = hrefKey(pathname, searchParams);

      if (target === current) return;

      if (!isCategoryHref(target)) {
        router.push(target);
        return;
      }

      clearNavTimer();
      pendingHrefRef.current = target;
      setIsNavigating(true);

      navTimerRef.current = setTimeout(() => {
        navTimerRef.current = null;
        const pending = pendingHrefRef.current;
        pendingHrefRef.current = null;
        if (!pending) {
          setIsNavigating(false);
          return;
        }

        const { pathname: targetPath, search: targetSearch } = parseHref(pending);

        if (targetPath === pathname) {
          setCategoryNavFilters(filtersFromSearch(targetSearch));
          window.history.replaceState(null, "", pending);
        } else {
          router.push(pending);
        }

        setIsNavigating(false);
      }, CATEGORY_NAV_DELAY_MS);
    },
    [pathname, searchParams, router, clearNavTimer],
  );

  useEffect(() => {
    setCategoryNavFilters(null);
    clearNavTimer();
    pendingHrefRef.current = null;
    setIsNavigating(false);
  }, [pathname, clearNavTimer]);

  useEffect(() => {
    document.body.classList.toggle("gb-store-navigating", isNavigating);
    return () => document.body.classList.remove("gb-store-navigating");
  }, [isNavigating]);

  useEffect(() => () => clearNavTimer(), [clearNavTimer]);

  return (
    <StoreNavigationContext.Provider value={{ isNavigating, navigateTo, categoryNavFilters }}>
      {children}
      {isNavigating ? (
        <div className="gb-nav-overlay" role="status" aria-live="polite" aria-label="Cargando categoría">
          <div className="gb-nav-overlay__panel">
            <BrandLogo variant="store" className="gb-nav-overlay__logo" />
            <p className="gb-nav-overlay__text gb-nav-overlay__text--loading">Cargando</p>
          </div>
        </div>
      ) : null}
    </StoreNavigationContext.Provider>
  );
}
