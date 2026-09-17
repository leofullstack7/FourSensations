"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAN_MS = 20000;
const FADE_MS = 1200;

type PanDir = "up" | "down";

type Layer = {
  id: number;
  src: string;
  dir: PanDir;
  fading: boolean;
  enter: boolean;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function ProductHeroPan({ urls, alt }: { urls: string[]; alt: string }) {
  const reduced = usePrefersReducedMotion();
  const start = useMemo(
    () => (urls.length > 0 ? Math.floor(Math.random() * urls.length) : 0),
    [urls],
  );
  const indexRef = useRef(start);
  const dirRef = useRef<PanDir>("up");
  const idRef = useRef(0);
  const [layers, setLayers] = useState<Layer[]>(() =>
    urls[start] ? [{ id: 0, src: urls[start], dir: "up", fading: false, enter: false }] : [],
  );

  useEffect(() => {
    indexRef.current = start;
    dirRef.current = "up";
    idRef.current = 0;
    setLayers(urls[start] ? [{ id: 0, src: urls[start], dir: "up", fading: false, enter: false }] : []);
  }, [urls, start]);

  const advance = useCallback(() => {
    if (urls.length === 0) return;
    const leavingId = idRef.current;
    const nextIndex = (indexRef.current + 1) % urls.length;
    const nextDir: PanDir = dirRef.current === "up" ? "down" : "up";
    const nextSrc = urls[nextIndex];
    if (!nextSrc) return;
    indexRef.current = nextIndex;
    dirRef.current = nextDir;
    idRef.current += 1;
    const incoming: Layer = {
      id: idRef.current,
      src: nextSrc,
      dir: nextDir,
      fading: false,
      enter: true,
    };
    setLayers((prev) => [
      ...prev.map((layer) => (layer.id === leavingId ? { ...layer, fading: true } : layer)),
      incoming,
    ]);
    window.setTimeout(() => {
      setLayers((prev) => prev.filter((layer) => layer.id !== leavingId));
    }, FADE_MS);
  }, [urls]);

  const topId = layers[layers.length - 1]?.id;

  useEffect(() => {
    if (reduced || topId == null || urls.length === 0) return;
    const timer = window.setTimeout(advance, PAN_MS);
    return () => window.clearTimeout(timer);
  }, [advance, reduced, topId, urls.length]);

  if (urls.length === 0) {
    return <div className="product-hero__bg product-hero__bg--empty" aria-hidden />;
  }

  if (reduced) {
    const src = urls[start] ?? urls[0]!;
    return (
      <Image
        src={src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="product-hero__bg product-hero__bg--static"
        unoptimized={src.startsWith("/")}
      />
    );
  }

  return (
    <div className="product-hero__pan" aria-hidden>
      {layers.map((layer, i) => (
        <div
          key={layer.id}
          className={`product-hero__slide${layer.enter ? " is-enter" : ""}${layer.fading ? " is-leaving" : ""}`}
        >
          <Image
            src={layer.src}
            alt={i === layers.length - 1 ? alt : ""}
            fill
            priority={layer.id === 0}
            sizes="100vw"
            className={`product-hero__bg product-hero__bg--${layer.dir}`}
            unoptimized={layer.src.startsWith("/")}
          />
        </div>
      ))}
    </div>
  );
}
