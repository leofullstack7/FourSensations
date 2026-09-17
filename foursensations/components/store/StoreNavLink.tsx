"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

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

/** Prefetch al hover; el splash de navegación lo captura StoreNavigationProvider. */
export function StoreNavLink({ href, onClick, prefetch = true, ...rest }: StoreNavLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const hrefStr = hrefToString(href);
  const targetPath = hrefStr.split("?")[0] || hrefStr;

  return (
    <Link
      {...rest}
      href={href}
      prefetch={prefetch}
      onMouseEnter={() => {
        if (targetPath !== pathname) router.prefetch(hrefStr);
      }}
      onClick={onClick}
    />
  );
}
