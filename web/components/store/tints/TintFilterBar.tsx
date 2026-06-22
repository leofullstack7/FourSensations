"use client";

import { motion } from "framer-motion";

export type TintFilterOption = {
  value: string;
  label: string;
  count?: number;
};

type TintFilterBarProps = {
  groups: TintFilterOption[];
  families: TintFilterOption[];
  types: TintFilterOption[];
  subcategories: TintFilterOption[];
  activeGroup: string | null;
  activeFamily: string | null;
  activeType: string | null;
  activeSubcategory: string | null;
  onGroupChange: (value: string | null) => void;
  onFamilyChange: (value: string | null) => void;
  onTypeChange: (value: string | null) => void;
  onSubcategoryChange: (value: string | null) => void;
};

export function TintFilterBar({
  groups,
  families,
  types,
  subcategories,
  activeGroup,
  activeFamily,
  activeType,
  activeSubcategory,
  onGroupChange,
  onFamilyChange,
  onTypeChange,
  onSubcategoryChange,
}: TintFilterBarProps) {
  return (
    <div className="tint-filters">
      <div className="tint-filters__groups" role="group" aria-label="Filtrar por grupo de tinte">
        <span className="tint-filters__groups-label">Explora por grupo</span>
        <div className="tint-filters__groups-row">
          <button
            type="button"
            className={`tint-chip tint-chip--lg${activeGroup === null ? " tint-chip--active" : ""}`}
            onClick={() => onGroupChange(null)}
          >
            Todos
          </button>
          {groups.map((g) => (
            <motion.button
              key={g.value}
              type="button"
              className={`tint-chip tint-chip--lg${activeGroup === g.value ? " tint-chip--active" : ""}`}
              onClick={() => onGroupChange(g.value)}
              whileTap={{ scale: 0.96 }}
            >
              {g.label}
              {typeof g.count === "number" && <span className="tint-chip__count">{g.count}</span>}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="tint-filters__secondary">
        <label className="tint-filters__select">
          <span>Familia</span>
          <select value={activeFamily ?? ""} onChange={(e) => onFamilyChange(e.target.value || null)}>
            <option value="">Todas</option>
            {families.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="tint-filters__select">
          <span>Tipo</span>
          <select value={activeType ?? ""} onChange={(e) => onTypeChange(e.target.value || null)}>
            <option value="">Todos</option>
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {subcategories.length > 0 && (
          <label className="tint-filters__select">
            <span>Subcategoría</span>
            <select
              value={activeSubcategory ?? ""}
              onChange={(e) => onSubcategoryChange(e.target.value || null)}
            >
              <option value="">Todas</option>
              {subcategories.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
