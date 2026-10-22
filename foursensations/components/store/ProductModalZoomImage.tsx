"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  preferFastStorefrontUrls,
  shouldBypassNextImageOptimizer,
} from "@/lib/util/image-url";

const ZOOM_SCALE = 2.75;

type ProductModalZoomImageProps = {
  src: string;
  alt?: string;
  objectFit?: "contain" | "cover";
  sizes?: string;
  className?: string;
};

export function ProductModalZoomImage({
  src,
  alt = "",
  objectFit = "contain",
  sizes = "(max-width: 900px) 100vw, 45vw",
  className,
}: ProductModalZoomImageProps) {
  const candidates = useMemo(() => preferFastStorefrontUrls([src]), [src]);
  const [candIndex, setCandIndex] = useState(0);
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });
  const current = candIndex < candidates.length ? candidates[candIndex] : "";

  useEffect(() => {
    setCandIndex(0);
    setZoom({ on: false, x: 50, y: 50 });
  }, [src]);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ on: true, x, y });
  }, []);

  if (!current) {
    return <div className={`modal-gallery-zoom${className ? ` ${className}` : ""}`} aria-hidden />;
  }

  return (
    <div
      className={`modal-gallery-zoom${zoom.on ? " modal-gallery-zoom--active" : ""}${className ? ` ${className}` : ""}`}
      onMouseEnter={() => setZoom((z) => ({ ...z, on: true }))}
      onMouseLeave={() => setZoom({ on: false, x: 50, y: 50 })}
      onMouseMove={onMove}
    >
      <Image
        key={current}
        src={current}
        alt={alt}
        fill
        sizes={sizes}
        priority
        unoptimized={shouldBypassNextImageOptimizer(current)}
        className="modal-gallery-zoom-img"
        style={{
          objectFit,
          transform: zoom.on ? `scale(${ZOOM_SCALE})` : undefined,
          transformOrigin: zoom.on ? `${zoom.x}% ${zoom.y}%` : undefined,
        }}
        onError={() => {
          setCandIndex((i) => (i + 1 < candidates.length ? i + 1 : candidates.length));
        }}
      />
    </div>
  );
}
