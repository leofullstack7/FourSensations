"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTintPanelPin } from "@/hooks/useTintPanelPin";
import type { TintBubbleItem } from "@/lib/tints";
import { TintFilterBar, type TintFilterOption } from "./TintFilterBar";
import { TintBubbleField } from "./TintBubbleField";
import { TintShowcasePanel } from "./TintShowcasePanel";
import "./tints.css";

type TintCategoryPageClientProps = {
  initialItems: TintBubbleItem[];
  addToCart: (item: TintBubbleItem) => void;
  formatPrice: (value: number) => string;
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
}: TintCategoryPageClientProps) {
  const searchParams = useSearchParams();

  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeFamily, setActiveFamily] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<TintBubbleItem | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

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

  const { mode, fixedStyle } = useTintPanelPin({
    bodyRef,
    colRef,
    panelRef,
    spacerRef,
    deps: [filteredItems.length, activeGroup, activeFamily, activeType, activeSubcategory, selected?.id],
  });

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

  return (
    <main className="tint-category">
      <header className="tint-category__head">
        <span className="tint-category__eyebrow">Colección de color</span>
        <h1>Tintes</h1>
        <p>Encuentra tu tono explorando por grupo, familia o tipo. Cada burbuja es un color real.</p>
      </header>

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

      <div className="tint-category__body" ref={bodyRef}>
        <div className="tint-category__bubbles">
          <TintBubbleField
            items={filteredItems}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            size="md"
          />
        </div>

        <div className="tint-category__panel-col" ref={colRef}>
          <div className="tint-category__panel-spacer" ref={spacerRef} aria-hidden="true" />
          <div
            ref={panelRef}
            className={`tint-category__panel${mode === "bottom" ? " tint-category__panel--bottom" : ""}`}
            style={mode === "fixed" ? fixedStyle : undefined}
          >
            <TintShowcasePanel active={selected} onAddToCart={addToCart} formatPrice={formatPrice} />
          </div>
        </div>
      </div>
    </main>
  );
}
