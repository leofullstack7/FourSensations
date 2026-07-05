"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReveal } from "@/hooks/useReveal";
import { TechAmbient } from "@/components/ui/TechAmbient";
import { getCategoryLandingCopy } from "@/lib/category-landing-theme";
import { TINTES_CATEGORY_SLUG } from "@/lib/bulk-import/tintes";
import type { TintBubbleItem } from "@/lib/tints";
import { TintFilterBar, type TintFilterOption } from "./TintFilterBar";
import { TintBubbleField } from "./TintBubbleField";
import { TintShowcasePanel } from "./TintShowcasePanel";
import "./tints.css";

type TintCategoryPageClientProps = {
  initialItems: TintBubbleItem[];
  addToCart: (item: TintBubbleItem) => void;
  formatPrice: (value: number) => string;
  categoryLabel?: string;
  categoryIcon?: string;
};

function buildOptions(items: TintBubbleItem[], key: keyof TintBubbleItem): TintFilterOption[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const raw = item[key];
    if (!raw) continue;
    const value = String(raw);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({ value, label: value, count }));
}

export function TintCategoryPageClient({
  initialItems,
  addToCart,
  formatPrice,
  categoryLabel = "Tintes",
  categoryIcon = "🎨",
}: TintCategoryPageClientProps) {
  const searchParams = useSearchParams();
  const copy = useMemo(
    () => getCategoryLandingCopy(categoryLabel, TINTES_CATEGORY_SLUG),
    [categoryLabel]
  );

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<TintBubbleItem | null>(null);

  const clearFilters = () => {
    setActiveGroup(null);
    setActiveFamily(null);
    setActiveType(null);
    setActiveSubcategory(null);
  };

  useEffect(() => {
    const tipoParam = searchParams?.get("tipo");
    if (tipoParam) setActiveType(tipoParam);
  }, [searchParams]);

  const groups = useMemo(() => buildOptions(initialItems, "group"), [initialItems]);
  const families = useMemo(() => buildOptions(initialItems, "family"), [initialItems]);
  const types = useMemo(() => buildOptions(initialItems, "type"), [initialItems]);
  const subcategories = useMemo(() => buildOptions(initialItems, "subcategory"), [initialItems]);

  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      if (activeGroup && item.group !== activeGroup) return false;
      if (activeFamily && item.family !== activeFamily) return false;
      if (activeType && item.type !== activeType) return false;
      if (activeSubcategory && item.subcategory !== activeSubcategory) return false;
      return true;
    });
  }, [initialItems, activeGroup, activeFamily, activeType, activeSubcategory]);

  useEffect(() => {
    if (selected && !filteredItems.some((i) => i.id === selected.id)) {
      setSelected(null);
    }
  }, [filteredItems, selected]);

  useEffect(() => {
    if (!selected && filteredItems.length > 0) {
      setSelected(filteredItems[0]!);
    }
  }, [filteredItems, selected]);

  const hasActiveFilters = Boolean(activeGroup || activeFamily || activeType || activeSubcategory);

  useReveal();

  return (
    <main className="category-landing-page tint-category-page">
      <section
        className="category-landing-hero section-pad"
        data-landing-slug={TINTES_CATEGORY_SLUG}
        aria-label={`Categoría ${categoryLabel}`}
      >
        <TechAmbient variant="page" />
        <div className="category-landing-hero-glow" aria-hidden />
        <div className="container category-landing-hero-inner">
          <div className="category-landing-hero-visual" aria-hidden>
            <span className="category-landing-icon tint-hero-icon">{categoryIcon}</span>
          </div>
          <div className="category-landing-hero-copy">
            <div className="gb-tech-chip tint-tech-chip">
              <span className="gb-tech-live-dot" style={{ width: 6, height: 6 }} aria-hidden />
              Laboratorio de color · IA
            </div>
            <div className="category-landing-eyebrow">Colección {categoryLabel}</div>
            <h1 className="category-landing-title">{copy.headline}</h1>
            <p className="category-landing-subtitle">{copy.subtitle}</p>
            <div className="category-landing-stats">
              <span className="category-landing-stat">◈ {initialItems.length} tonos</span>
              <span className="category-landing-stat">⬡ {families.length} familias</span>
              <span className="category-landing-stat">✦ Selector interactivo</span>
            </div>
            <div className="category-landing-cta-row">
              <Link href="/" className="btn btn-outline btn-sm category-landing-cta-back">
                {copy.ctaBack}
              </Link>
              <button
                type="button"
                className="btn btn-primary btn-sm category-landing-cta-primary"
                onClick={clearFilters}
              >
                {copy.ctaExplore}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad tint-category-page__content reveal" style={{ paddingTop: 24 }}>
        <div className="container">
          <TintFilterBar
            groups={groups}
            families={families}
            types={types}
            subcategories={subcategories}
            activeGroup={activeGroup}
            activeFamily={activeFamily}
            activeType={activeType}
            activeSubcategory={activeSubcategory}
            onGroupChange={setActiveGroup}
            onFamilyChange={setActiveFamily}
            onTypeChange={setActiveType}
            onSubcategoryChange={setActiveSubcategory}
          />

          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "14px 0 20px" }}>
            {filteredItems.length} tinte(s) en <strong>{categoryLabel}</strong>
            {hasActiveFilters ? " con filtros activos" : ""}
          </p>

          <div className="tint-category__body reveal-stagger">
            <div className="tint-category__bubbles tint-bubbles-field--tech">
              <TintBubbleField
                items={filteredItems}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
                size="md"
              />
            </div>

            <div className="tint-category__panel tint-showcase--tech">
              <TintShowcasePanel active={selected} onAddToCart={addToCart} formatPrice={formatPrice} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
