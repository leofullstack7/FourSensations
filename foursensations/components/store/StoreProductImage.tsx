"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  isDisplayableImageUrl,
  preferFastStorefrontUrls,
  shouldBypassNextImageOptimizer,
} from "@/lib/util/image-url";

type StoreProductImageProps = {
  src: string | null | undefined;
  fallbacks?: readonly (string | null | undefined)[];
  alt?: string;
  emoji?: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
};

/**
 * Imagen de producto con candidatos y fallback a emoji.
 * Evita el “cuadrito” roto de next/image cuando falla /api/media/stored.
 */
export function StoreProductImage({
  src,
  fallbacks = [],
  alt = "",
  emoji = "📦",
  priority = false,
  className = "product-img product-img--main",
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px",
}: StoreProductImageProps) {
  const candidates = useMemo(() => {
    const raw = [src, ...fallbacks].filter((u): u is string => Boolean(u && isDisplayableImageUrl(u)));
    return preferFastStorefrontUrls(raw);
  }, [src, fallbacks]);

  const [index, setIndex] = useState(0);
  const current = index < candidates.length ? candidates[index] : "";

  if (!current) {
    return <span className="product-img-emoji" aria-hidden>{emoji}</span>;
  }

  return (
    <Image
      key={current}
      src={current}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      unoptimized={shouldBypassNextImageOptimizer(current)}
      className={className}
      style={{ objectFit: "cover" }}
      onError={() => {
        setIndex((i) => {
          if (i + 1 < candidates.length) return i + 1;
          return candidates.length; // agota → emoji
        });
      }}
    />
  );
}
