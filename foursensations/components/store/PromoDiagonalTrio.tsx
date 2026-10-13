"use client";

import Image from "next/image";
import Link from "next/link";
import type { StaticImageData } from "next/image";
import kitCover from "@/assets/productos/FS023 Kit Completo/FS023-2.webp";
import mistCover from "@/assets/productos/FS019 Brumas capilares/FS019-14.webp";
import labOrBrand from "@/assets/productos/FS005 Botanical/FS005-1.webp";

const INSTAGRAM_URL = "https://instagram.com/foursensations_oficial?dlrf=a3V3ZGs2OTA0MnBn";

type Panel = {
  href: string;
  label: string;
  eyebrow: string;
  image: StaticImageData;
  external?: boolean;
};

const PANELS: readonly Panel[] = [
  {
    href: "#featured",
    label: "Ver Todos los productos",
    eyebrow: "Catálogo",
    image: kitCover,
  },
  {
    href: INSTAGRAM_URL,
    label: "Ver Instagram",
    eyebrow: "Comunidad",
    image: mistCover,
    external: true,
  },
  {
    href: "/sobre-nosotros",
    label: "Todo sobre nosotros",
    eyebrow: "Marca",
    image: labOrBrand,
  },
];

export function PromoDiagonalTrio() {
  return (
    <div className="promo-diagonal" aria-label="Accesos rápidos">
      {PANELS.map((panel) => {
        const inner = (
          <>
            <Image
              src={panel.image}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 20vw"
              className="promo-diagonal__img"
            />
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
