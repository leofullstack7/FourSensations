"use client";

import { useEffect } from "react";

/**
 * Paridad con IntersectionObserver del index.html (.reveal → .visible).
 * Observa nodos nuevos (dynamic imports / defer) para que no se queden en opacity:0.
 */
export function useReveal() {
  useEffect(() => {
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.06, rootMargin: "64px 0px 64px 0px" },
    );

    const attach = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      // Above-the-fold / casi visible: mostrar ya (evita huecos blancos).
      if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
        el.classList.add("visible");
      }
      observer.observe(el);
    };

    const scan = () => {
      document.querySelectorAll(".reveal, .reveal-stagger").forEach(attach);
    };

    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      observer.disconnect();
    };
  }, []);
}
