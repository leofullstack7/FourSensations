"use client";

import Image from "next/image";
import type { StaticImageData } from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  isDisplayableImageUrl,
  preferFastStorefrontUrls,
  shouldBypassNextImageOptimizer,
} from "@/lib/util/image-url";

const SHOTS = ["fs-account-collage__shot--a", "fs-account-collage__shot--b", "fs-account-collage__shot--c"] as const;

export type CollageSource = string | StaticImageData;

function CollageShot({ src, priority }: { src: CollageSource; priority?: boolean }) {
  const candidates = useMemo(() => {
    if (typeof src !== "string") return [] as string[];
    if (!isDisplayableImageUrl(src) && !src.startsWith("/")) return [];
    return preferFastStorefrontUrls([src]);
  }, [src]);
  const candidatesKey = candidates.join("|");
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [candidatesKey]);
  const current = typeof src === "string" ? (index < candidates.length ? candidates[index] : "") : src;

  if (!current) return null;

  const unoptimized =
    typeof current === "string" ? shouldBypassNextImageOptimizer(current) : false;

  return (
    <Image
      key={typeof current === "string" ? current : current.src}
      src={current}
      alt=""
      fill
      sizes="(max-width: 860px) 46vw, 280px"
      priority={priority}
      unoptimized={unoptimized}
      onError={() => {
        if (typeof src !== "string") return;
        setIndex((i) => (i + 1 < candidates.length ? i + 1 : candidates.length));
      }}
    />
  );
}

export function ProductCollage({ sources }: { sources: CollageSource[] }) {
  const shots = sources.slice(0, 3);

  return (
    <div className="fs-account-collage" aria-hidden>
      <span className="fs-account-collage__orb fs-account-collage__orb--1" />
      <span className="fs-account-collage__orb fs-account-collage__orb--2" />
      <span className="fs-account-collage__bloom" />
      {shots.map((src, i) => (
        <figure key={i} className={`fs-account-collage__shot ${SHOTS[i]}`}>
          <CollageShot src={src} priority={i === 0} />
        </figure>
      ))}
    </div>
  );
}
