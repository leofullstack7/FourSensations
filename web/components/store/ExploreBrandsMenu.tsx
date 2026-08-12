"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { StoreBrandListItem } from "@/lib/brand-display";

export function ExploreBrandsMenu() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<StoreBrandListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const loadBrands = useCallback(async () => {
    if (brands.length > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/brands", { cache: "no-store" });
      if (!res.ok) throw new Error("fail");
      const data = (await res.json()) as { brands?: StoreBrandListItem[] };
      setBrands(Array.isArray(data.brands) ? data.brands : []);
    } catch {
      setError("No se pudieron cargar las marcas.");
    } finally {
      setLoading(false);
    }
  }, [brands.length, loading]);

  useEffect(() => {
    if (!open) return;
    void loadBrands();
  }, [open, loadBrands]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`explore-brands${open ? " is-open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="explore-brands-btn"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="explore-brands-btn__label">Explora nuestras marcas</span>
        <svg className="explore-brands-btn__chev" width="12" height="12" viewBox="0 0 10 10" aria-hidden>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className="explore-brands-panel" role="listbox" id={listId} aria-label="Marcas">
          <div className="explore-brands-panel__head">
            <span>Marcas</span>
            <span className="explore-brands-panel__hint">Elige una colección</span>
          </div>
          <div className="explore-brands-panel__scroll">
            {loading ? (
              <p className="explore-brands-panel__status">Cargando marcas…</p>
            ) : error ? (
              <p className="explore-brands-panel__status explore-brands-panel__status--err">{error}</p>
            ) : brands.length === 0 ? (
              <p className="explore-brands-panel__status">Aún no hay marcas en el catálogo.</p>
            ) : (
              brands.map((b) => (
                <Link
                  key={b.slug}
                  href={`/marca/${b.slug}`}
                  className="explore-brands-item"
                  role="option"
                  onClick={() => setOpen(false)}
                >
                  <span className="explore-brands-item__name">{b.displayName}</span>
                  <span className="explore-brands-item__count">{b.productCount}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
