"use client";

import Image from "next/image";
import { useState } from "react";

export function AccessoriesPhotoGallery({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (urls.length === 0) return null;

  return (
    <>
      <div className="fs-acc-wall" aria-label="Galería de accesorios Four Sensations">
        {urls.map((src, i) => (
          <button
            key={src}
            type="button"
            className={`fs-acc-wall__shot fs-acc-wall__shot--${(i % 6) + 1}`}
            onClick={() => setOpen(src)}
          >
            <Image src={src} alt="" fill sizes="(max-width: 700px) 46vw, 220px" />
          </button>
        ))}
      </div>
      {open ? (
        <div className="fs-acc-lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <button type="button" className="fs-acc-lightbox__close" aria-label="Cerrar">
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      ) : null}
    </>
  );
}
