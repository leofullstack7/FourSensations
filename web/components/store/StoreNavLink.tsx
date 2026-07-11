"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { useStoreNavigation } from "@/components/store/StoreNavigationProvider";

type StoreNavLinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function hrefToString(href: ComponentProps<typeof Link>["href"]): string {
  if (typeof href === "string") return href;
  const path = href.pathname ?? "";
  const search = href.search ?? "";
  const query = href.query
    ? "?" +
      new URLSearchParams(
        Object.entries(href.query).flatMap(([k, v]) =>
          v == null ? [] : Array.isArray(v) ? v.map((x) => [k, String(x)]) : [[k, String(v)]],
        ),
      ).toString()
    : "";
  return `${path}${search || query}`;
}

function isCategoryHref(href: string): boolean {
  const path = href.split("?")[0] || href;
  return path.startsWith("/categoria/");
}

/** Enlace de tienda: categorías → loader + navegación; misma ruta → filtros al instante. */
export function StoreNavLink({ href, onClick, prefetch = true, ...rest }: StoreNavLinkProps) {
  const { navigateTo } = useStoreNavigation();
  const pathname = usePathname();
  const router = useRouter();
  const hrefStr = hrefToString(href);
  const targetPath = hrefStr.split("?")[0] || hrefStr;
  const categoryLink = isCategoryHref(hrefStr);

  const handleCategoryNav = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    navigateTo(hrefStr);
  };

  return (
    <Link
      {...rest}
      href={href}
      prefetch={prefetch}
      onMouseEnter={() => {
        if (targetPath !== pathname) router.prefetch(hrefStr);
      }}
      onMouseDown={categoryLink ? handleCategoryNav : undefined}
      onClick={(e) => {
        if (categoryLink) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (targetPath === pathname) {
          e.preventDefault();
          navigateTo(hrefStr);
        }
      }}
    />
  );
}
