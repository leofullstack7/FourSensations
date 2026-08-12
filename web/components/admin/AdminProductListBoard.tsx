"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lista de productos en desktop con sidebar abierto:
 * barra sticky (buscador + filtros) y flechas para desplazar columnas,
 * dejando fija la columna de nombre.
 */
export function AdminProductListBoard({
  sidebarExpanded,
  toolbar,
  children,
}: {
  sidebarExpanded: boolean;
  toolbar: ReactNode;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanLeft(false);
      setCanRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 6);
    setCanRight(max - el.scrollLeft > 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(() => updateArrows());
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, sidebarExpanded, children]);

  const scrollCols = (dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  return (
    <div
      className={`admin-product-list-board${
        sidebarExpanded ? " admin-product-list-board--sidebar-open" : ""
      }`}
    >
      <div className="admin-product-list-sticky">
        <div className="admin-product-list-sticky__filters">{toolbar}</div>
        <div className="admin-product-list-col-nav" aria-hidden={!sidebarExpanded}>
          <button
            type="button"
            className="admin-product-list-col-nav__btn"
            onClick={() => scrollCols(-1)}
            disabled={!sidebarExpanded || !canLeft}
            aria-label="Ver columnas a la izquierda"
            title="Columnas a la izquierda"
          >
            ‹
          </button>
          <button
            type="button"
            className="admin-product-list-col-nav__btn"
            onClick={() => scrollCols(1)}
            disabled={!sidebarExpanded || !canRight}
            aria-label="Ver columnas a la derecha"
            title="Columnas a la derecha"
          >
            ›
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="admin-card admin-table-wrap admin-product-list-scroll" style={{ padding: 0 }}>
        {children}
      </div>
    </div>
  );
}
