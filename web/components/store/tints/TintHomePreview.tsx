"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { TechAmbient } from "@/components/ui/TechAmbient";
import type { TintBubbleItem } from "@/lib/tints";
import "./tints.css";

type TintHomePreviewProps = {
  items: TintBubbleItem[];
  categoryHref?: string;
};

type TypeCard = {
  type: string;
  representative: TintBubbleItem;
  count: number;
};

export function TintHomePreview({ items, categoryHref = "/categoria/tintes" }: TintHomePreviewProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [activeFamily, setActiveFamily] = useState<string | null>(null);

  const families = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.family && set.add(i.family));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [items]);

  const typeCards: TypeCard[] = useMemo(() => {
    const filtered = activeFamily ? items.filter((i) => i.family === activeFamily) : items;
    const map = new Map<string, TypeCard>();
    for (const item of filtered) {
      if (!item.type) continue;
      const existing = map.get(item.type);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(item.type, { type: item.type, representative: item, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [items, activeFamily]);

  if (!items.length) return null;

  return (
    <section className="tint-home-preview tint-home-preview--modern reveal" aria-labelledby="tint-home-preview-title">
      <TechAmbient variant="page" />
      <div className="tint-home-preview__inner">
        <div className="tint-home-preview__head">
          <div className="tint-home-preview__head-copy">
            <span className="gb-tech-chip tint-home-preview__tech-badge">
              <span className="gb-tech-live-dot" style={{ width: 6, height: 6 }} aria-hidden />
              Paleta interactiva
            </span>
            <span className="tint-home-preview__eyebrow">Color que se nota</span>
            <h2 id="tint-home-preview-title">
              Tipos de <em>tinte</em>
            </h2>
            <p className="tint-home-preview__lead">
              {typeCards.length} líneas disponibles · elige un tipo para ver todos los tonos en la colección.
            </p>
          </div>
          <Link href={categoryHref} className="tint-home-preview__see-all btn btn-outline btn-sm">
            Ver toda la colección →
          </Link>
        </div>

        {families.length > 1 && (
          <div className="tint-home-preview__families">
            <button
              type="button"
              className={`tint-chip${activeFamily === null ? " tint-chip--active" : ""}`}
              onClick={() => setActiveFamily(null)}
            >
              Todas las familias
            </button>
            {families.map((f) => (
              <button
                key={f}
                type="button"
                className={`tint-chip${activeFamily === f ? " tint-chip--active" : ""}`}
                onClick={() => setActiveFamily(f)}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <div className="tint-home-preview__track-wrap">
          <div className="tint-home-preview__track fade-edge-x">
            {typeCards.map((card, i) => (
              <motion.button
                key={card.type}
                type="button"
                className="tint-type-card tint-type-card--modern"
                onClick={() => router.push(`${categoryHref}?tipo=${encodeURIComponent(card.type)}`)}
                initial={{ opacity: 0, y: 20, scale: 0.94 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{
                  duration: 0.45,
                  delay: reduceMotion ? 0 : Math.min(i * 0.06, 0.35),
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={reduceMotion ? {} : { y: -8, transition: { duration: 0.28 } }}
                whileTap={{ scale: 0.96 }}
              >
                <span className="tint-type-card__halo" aria-hidden />
                <span className="tint-type-card__img-wrap">
                  <Image
                    src={card.representative.mainImageUrl}
                    alt={card.type}
                    fill
                    sizes="160px"
                    className="tint-type-card__img"
                  />
                  <span className="tint-type-card__ring" aria-hidden="true" />
                </span>
                <span className="tint-type-card__label">{card.type}</span>
                <span className="tint-type-card__count">
                  {card.count} tono{card.count === 1 ? "" : "s"}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
