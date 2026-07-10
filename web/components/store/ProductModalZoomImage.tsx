"use client";

import Image from "next/image";
import { useCallback, useState } from "react";

const ZOOM_SCALE = 2.75;

type ProductModalZoomImageProps = {
  src: string;
  alt?: string;
};

export function ProductModalZoomImage({ src, alt = "" }: ProductModalZoomImageProps) {
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ on: true, x, y });
  }, []);

  return (
    <div
      className={`modal-gallery-zoom${zoom.on ? " modal-gallery-zoom--active" : ""}`}
      onMouseEnter={() => setZoom((z) => ({ ...z, on: true }))}
      onMouseLeave={() => setZoom({ on: false, x: 50, y: 50 })}
      onMouseMove={onMove}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 900px) 100vw, 45vw"
        priority
        unoptimized
        className="modal-gallery-zoom-img"
        style={{
          objectFit: "contain",
          transform: zoom.on ? `scale(${ZOOM_SCALE})` : undefined,
          transformOrigin: zoom.on ? `${zoom.x}% ${zoom.y}%` : undefined,
        }}
      />
    </div>
  );
}
