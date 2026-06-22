"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DESKTOP_MQ = "(min-width: 881px)";

export type TintPanelPinMode = "static" | "fixed" | "bottom";

type Metrics = {
  pinTop: number;
  left: number;
  width: number;
  colTopDoc: number;
  colHeight: number;
  panelHeight: number;
};

/**
 * Mantiene el panel de preview visible al hacer scroll por la grilla de tintes:
 * fijo en Y (posición inicial) mientras recorres la lista; al final, sube con la sección.
 */
export function useTintPanelPin({
  bodyRef,
  colRef,
  panelRef,
  spacerRef,
  deps = [],
}: {
  bodyRef: React.RefObject<HTMLElement | null>;
  colRef: React.RefObject<HTMLElement | null>;
  panelRef: React.RefObject<HTMLElement | null>;
  spacerRef: React.RefObject<HTMLElement | null>;
  deps?: unknown[];
}) {
  const [mode, setMode] = useState<TintPanelPinMode>("static");
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties>({});
  const metricsRef = useRef<Metrics | null>(null);
  const rafRef = useRef<number | null>(null);

  const applyPin = useCallback(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    if (!mq.matches) {
      setMode("static");
      setFixedStyle({});
      if (spacerRef.current) spacerRef.current.style.height = "0";
      return;
    }

    const m = metricsRef.current;
    const col = colRef.current;
    if (!m || !col) return;

    const scrollY = window.scrollY;
    const colRect = col.getBoundingClientRect();
    m.left = colRect.left;
    m.width = colRect.width;

    const threshold = m.colTopDoc - m.pinTop;
    const scrollEnd = m.colTopDoc + m.colHeight - m.panelHeight - m.pinTop;

    if (spacerRef.current) {
      spacerRef.current.style.height = scrollY > threshold ? `${m.panelHeight}px` : "0";
    }

    if (scrollY <= threshold) {
      setMode("static");
      setFixedStyle({});
      return;
    }

    if (scrollY >= scrollEnd) {
      setMode("bottom");
      setFixedStyle({});
      return;
    }

    setMode("fixed");
    setFixedStyle({
      position: "fixed",
      top: m.pinTop,
      left: m.left,
      width: m.width,
      zIndex: 20,
    });
  }, [colRef, spacerRef]);

  const measure = useCallback(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const body = bodyRef.current;
    const col = colRef.current;
    const panel = panelRef.current;

    if (!mq.matches || !body || !col || !panel) {
      metricsRef.current = null;
      setMode("static");
      setFixedStyle({});
      if (spacerRef.current) spacerRef.current.style.height = "0";
      return;
    }

    setMode("static");
    setFixedStyle({});

    requestAnimationFrame(() => {
      const panelEl = panelRef.current;
      const colEl = colRef.current;
      const bodyEl = bodyRef.current;
      if (!panelEl || !colEl || !bodyEl) return;

      const panelRect = panelEl.getBoundingClientRect();
      const colRect = colEl.getBoundingClientRect();
      const scrollY = window.scrollY;

      metricsRef.current = {
        pinTop: Math.round(panelRect.top),
        left: colRect.left,
        width: colRect.width,
        colTopDoc: colRect.top + scrollY,
        colHeight: bodyEl.offsetHeight,
        panelHeight: panelEl.offsetHeight,
      };

      applyPin();
    });
  }, [applyPin, bodyRef, colRef, panelRef, spacerRef]);

  useEffect(() => {
    measure();

    const schedule = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(applyPin);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (bodyRef.current) ro?.observe(bodyRef.current);
    if (colRef.current) ro?.observe(colRef.current);
    if (panelRef.current) ro?.observe(panelRef.current);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      ro?.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, applyPin, ...deps]);

  return { mode, fixedStyle };
}
