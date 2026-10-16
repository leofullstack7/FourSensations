"use client";

import Image from "next/image";
import Link from "next/link";
import type { StaticImageData } from "next/image";
import kitCover from "@/assets/productos/FS023 Kit Completo/FS023-2.webp";
import mistCover from "@/assets/productos/FS019 Brumas capilares/FS019-14.webp";
import labOrBrand from "@/assets/productos/FS005 Botanical/FS005-1.webp";
import type { HomePromoWidgets } from "@/lib/home-content";

const INSTAGRAM_URL = "https://instagram.com/foursensations_oficial?dlrf=a3V3ZGs2OTA0MnBn";

type Panel = {
  key: "catalogo" | "instagram" | "marca";
  href: string;
  label: string;
  eyebrow: string;
  fallback: StaticImageData;
  external?: boolean;
};

const PANELS: readonly Panel[] = [
  {
    key: "catalogo",
    href: "#featured",
    label: "Ver Todos los productos",
    eyebrow: "Catálogo",
    fallback: kitCover,
  },
  {
    key: "instagram",
    href: INSTAGRAM_URL,
    label: "Ver Instagram",
    eyebrow: "Comunidad",
    fallback: mistCover,
    external: true,
  },
  {
    key: "marca",
    href: "/sobre-nosotros",
    label: "Todo sobre nosotros",
    eyebrow: "Marca",
    fallback: labOrBrand,
  },
];

type PromoDiagonalTrioProps = {
  images?: HomePromoWidgets | null;
};

export function PromoDiagonalTrio({ images }: PromoDiagonalTrioProps) {
  return (
    <div className="promo-diagonal" aria-label="Accesos rápidos">
      {PANELS.map((panel) => {
        const override = images?.[panel.key]?.trim();
        const inner = (
          <>
            {override ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={override}
                alt=""
                className="promo-diagonal__img"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Image
                src={panel.fallback}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 20vw"
                className="promo-diagonal__img"
              />
            )}
            <span className="promo-diagonal__veil" aria-hidden />
            <span className="promo-diagonal__copy">
              <span className="promo-diagonal__eyebrow">{panel.eyebrow}</span>
              <span className="promo-diagonal__label">{panel.label}</span>
            </span>
          </>
        );

        if (panel.external) {
          return (
            <a
              key={panel.label}
              href={panel.href}
              className="promo-diagonal__panel"
              target="_blank"
              rel="noopener noreferrer"
            >
              {inner}
            </a>
          );
        }

        return (
          <Link key={panel.label} href={panel.href} className="promo-diagonal__panel" prefetch>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
