"use client";

import Link from "next/link";
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

/** Enlace de tienda con loader inmediato al navegar (mega menú, categorías). */
export function StoreNavLink({ href, onClick, prefetch = true, ...rest }: StoreNavLinkProps) {
  const { navigateTo } = useStoreNavigation();
  const hrefStr = hrefToString(href);

  return (
    <Link
      {...rest}
      href={href}
      prefetch={prefetch}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        navigateTo(hrefStr);
      }}
    />
  );
}
