"use client";

import { CrystalHeartSplash } from "@/components/brand/CrystalHeartSplash";
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
import { createPortal } from "react-dom";

export type CategoryNavFilters = {
  grupo: string;
  sub: string;
  tag: string;
};

type StoreNavigationContextValue = {
  isNavigating: boolean;
  navigateTo: (href: string) => void;
  categoryNavFilters: CategoryNavFilters | null;
};

const StoreNavigationContext = createContext<StoreNavigationContextValue | null>(null);

const INTRO_MS = 2800;
const INTRO_OUT_MS = 550;
const ROUTE_MIN_MS = 1500;
const ROUTE_OUT_MS = 450;

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

function navLabelFromHref(href: string): string {
  const { pathname } = parseHref(normalizeHref(href));
  if (pathname.startsWith("/categoria/")) {
    const slug = pathname.replace(/^\/categoria\//, "").trim();
    if (!slug) return "tu categoría";
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  if (pathname.startsWith("/producto/")) return "la ficha";
  if (pathname.startsWith("/mayorista")) return "mayorista";
  if (pathname.startsWith("/combos")) return "combos";
  if (pathname.startsWith("/cuenta")) return "tu cuenta";
  if (pathname.startsWith("/checkout")) return "el checkout";
  if (pathname === "/") return "el inicio";
  return "Four Sensations";
}

function isInternalStoreUrl(url: URL, currentOrigin: string): boolean {
  if (url.origin !== currentOrigin) return false;
  if (url.pathname.startsWith("/admin")) return false;
  if (url.pathname.startsWith("/api")) return false;
  if (url.pathname.startsWith("/lab")) return false;
  return true;
}

export function StoreNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [categoryNavFilters, setCategoryNavFilters] = useState<CategoryNavFilters | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navExiting, setNavExiting] = useState(false);
  const [navOverlayLabel, setNavOverlayLabel] = useState("Four Sensations");
  const [introOpen, setIntroOpen] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const navStartedAtRef = useRef(0);
  const pendingHrefRef = useRef<string | null>(null);
  const hideNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sameRouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (hideNavTimerRef.current) {
      clearTimeout(hideNavTimerRef.current);
      hideNavTimerRef.current = null;
    }
    if (sameRouteTimerRef.current) {
      clearTimeout(sameRouteTimerRef.current);
      sameRouteTimerRef.current = null;
    }
  }, []);

  const finishNavigation = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    clearTimers();
    const elapsed = Date.now() - navStartedAtRef.current;
    const wait = Math.max(0, ROUTE_MIN_MS - elapsed);
    hideNavTimerRef.current = setTimeout(() => {
      setNavExiting(true);
      hideNavTimerRef.current = setTimeout(() => {
        setIsNavigating(false);
        setNavExiting(false);
        pendingHrefRef.current = null;
        closingRef.current = false;
      }, ROUTE_OUT_MS);
    }, wait);
  }, [clearTimers]);

  const navigateTo = useCallback(
    (href: string) => {
      const target = normalizeHref(href);
      const current = hrefKey(pathname, searchParams);
      if (target === current) return;

      clearTimers();
      closingRef.current = false;
      pendingHrefRef.current = target;
      navStartedAtRef.current = Date.now();
      setNavOverlayLabel(navLabelFromHref(target));
      setNavExiting(false);
      setIsNavigating(true);

      const { pathname: targetPath, search: targetSearch } = parseHref(target);

      if (targetPath === pathname && isCategoryHref(target)) {
        sameRouteTimerRef.current = setTimeout(() => {
          setCategoryNavFilters(filtersFromSearch(targetSearch));
          window.history.replaceState(null, "", target);
          finishNavigation();
        }, ROUTE_MIN_MS);
        return;
      }

      router.push(target);
    },
    [pathname, searchParams, router, clearTimers, finishNavigation],
  );

  useEffect(() => {
    if (!isNavigating || !pendingHrefRef.current) return;
    const pending = pendingHrefRef.current;
    const { pathname: targetPath } = parseHref(pending);
    const current = hrefKey(pathname, searchParams);
    if (current === pending || pathname === targetPath) {
      finishNavigation();
    }
  }, [pathname, searchParams, isNavigating, finishNavigation]);

  useEffect(() => {
    document.body.classList.toggle("gb-store-navigating", isNavigating || introOpen);
    document.body.classList.toggle("fs-heart-lock", isNavigating || introOpen);
    return () => {
      document.body.classList.remove("gb-store-navigating");
      document.body.classList.remove("fs-heart-lock");
    };
  }, [isNavigating, introOpen]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 700 : INTRO_MS;
    const t = window.setTimeout(() => {
      setIntroExiting(true);
      window.setTimeout(() => setIntroOpen(false), INTRO_OUT_MS);
    }, hold);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href") ?? "";
      if (rawHref.startsWith("#") || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (!isInternalStoreUrl(url, window.location.origin)) return;
      if (url.hash && url.pathname === pathname) return;

      const href = `${url.pathname}${url.search}`;
      const current = hrefKey(pathname, searchParams);
      if (href === current) return;

      event.preventDefault();
      navigateTo(href);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigateTo, pathname, searchParams]);

  const overlay =
    portalReady && (introOpen || isNavigating) ? (
      <CrystalHeartSplash
        mode={introOpen ? "intro" : "route"}
        label={introOpen ? undefined : navOverlayLabel}
        exiting={introOpen ? introExiting : navExiting}
      />
    ) : null;

  return (
    <StoreNavigationContext.Provider value={{ isNavigating, navigateTo, categoryNavFilters }}>
      {children}
      {overlay && typeof document !== "undefined" ? createPortal(overlay, document.body) : null}
    </StoreNavigationContext.Provider>
  );
}
