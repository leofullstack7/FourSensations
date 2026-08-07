"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { BulkZipImageUrlCache } from "@/lib/bulk-import/zip-image-cache";

type MatchedImageRef = {
  imageFilename: string;
  matchedBy?: string;
};

export function AdminBulkImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="admin-bulk-image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada de imagen"
      onClick={onClose}
    >
      <button
        type="button"
        className="admin-bulk-image-lightbox__close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Cerrar imagen ampliada"
      >
        ✕ Cerrar
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ""}
        className="admin-bulk-image-lightbox__img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

function BulkZipThumb({
  cache,
  filename,
  onExpand,
}: {
  cache: BulkZipImageUrlCache | null;
  filename: string;
  onExpand: (src: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    if (!cache || !filename) {
      setFailed(true);
      return;
    }
    void cache.getUrl(filename).then((url) => {
      if (cancelled) return;
      if (url) setSrc(url);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [cache, filename]);

  if (failed && !src) {
    return (
      <span className="admin-bulk-match-thumb admin-bulk-match-thumb--empty" title={filename}>
        🖼️
      </span>
    );
  }

  if (!src) {
    return <span className="admin-bulk-match-thumb admin-bulk-match-thumb--loading" aria-hidden />;
  }

  return (
    <button
      type="button"
      className="admin-bulk-match-thumb"
      title={`${filename} — clic para ampliar`}
      onClick={(e) => {
        e.stopPropagation();
        onExpand(src);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" />
    </button>
  );
}

/** Miniaturas de imágenes matcheadas del ZIP + lightbox al hacer clic. */
export function AdminBulkMatchedImages({
  images,
  cache,
  maxVisible = 3,
}: {
  images: MatchedImageRef[];
  cache: BulkZipImageUrlCache | null;
  maxVisible?: number;
}) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  if (!images.length) {
    return <span style={{ color: "var(--text-muted)" }}>—</span>;
  }

  const shown = images.slice(0, maxVisible);
  const extra = images.length - shown.length;

  return (
    <>
      <div className="admin-bulk-match-thumbs" onClick={(e) => e.stopPropagation()}>
        {shown.map((m) => (
          <BulkZipThumb
            key={m.imageFilename}
            cache={cache}
            filename={m.imageFilename}
            onExpand={(src) => setLightbox({ src, alt: m.imageFilename })}
          />
        ))}
        {extra > 0 ? (
          <span className="admin-bulk-match-thumb-more" title={images.map((m) => m.imageFilename).join(", ")}>
            +{extra}
          </span>
        ) : null}
      </div>
      {lightbox ? (
        <AdminBulkImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}
