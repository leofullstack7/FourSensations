"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import logoImage from "@/app/logo.png";

/** Respaldo si la navegación se queda colgada (p. ej. error de red). */
const NAV_LOADER_SAFETY_MS = 20000;

type StoreNavigationContextValue = {
  isNavigating: boolean;
  navigateTo: (href: string) => void;
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

export function StoreNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [navActive, setNavActive] = useState(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const stopNavigation = useCallback(() => {
    clearSafetyTimer();
    setNavActive(false);
  }, [clearSafetyTimer]);

  const navigateTo = useCallback(
    (href: string) => {
      const target = normalizeHref(href);
      const current = hrefKey(pathname, searchParams);

      if (target === current) {
        stopNavigation();
        return;
      }

      setNavActive(true);
      clearSafetyTimer();
      safetyTimerRef.current = setTimeout(stopNavigation, NAV_LOADER_SAFETY_MS);

      startTransition(() => {
        router.push(target);
      });
    },
    [pathname, searchParams, router, clearSafetyTimer, stopNavigation],
  );

  useEffect(() => {
    if (!isPending && navActive) {
      stopNavigation();
    }
  }, [isPending, navActive, stopNavigation]);

  useEffect(() => () => clearSafetyTimer(), [clearSafetyTimer]);

  const showOverlay = navActive || isPending;

  return (
    <StoreNavigationContext.Provider value={{ isNavigating: showOverlay, navigateTo }}>
      {children}
      {showOverlay ? (
        <div className="gb-nav-overlay" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando página">
          <div className="gb-nav-overlay__panel">
            <div className="gb-loading-brand-ring gb-nav-overlay__logo">
              <Image src={logoImage} alt="" width={56} height={56} priority />
            </div>
            <div className="gb-loading-pulse-bar" aria-hidden />
            <p className="gb-nav-overlay__text">Preparando tu experiencia…</p>
          </div>
        </div>
      ) : null}
    </StoreNavigationContext.Provider>
  );
}
