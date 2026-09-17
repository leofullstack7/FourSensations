"use client";

import Image from "next/image";
import type { StaticImageData } from "next/image";

const SHOTS = ["fs-account-collage__shot--a", "fs-account-collage__shot--b", "fs-account-collage__shot--c"] as const;

export type CollageSource = string | StaticImageData;

export function ProductCollage({ sources }: { sources: CollageSource[] }) {
  const shots = sources.slice(0, 3);

  return (
    <div className="fs-account-collage" aria-hidden>
      <span className="fs-account-collage__orb fs-account-collage__orb--1" />
      <span className="fs-account-collage__orb fs-account-collage__orb--2" />
      <span className="fs-account-collage__bloom" />
      {shots.map((src, i) => (
        <figure key={i} className={`fs-account-collage__shot ${SHOTS[i]}`}>
          <Image src={src} alt="" fill sizes="(max-width: 860px) 46vw, 280px" priority={i === 0} />
        </figure>
      ))}
    </div>
  );
}
