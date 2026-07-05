"use client";

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

function FilterChipRow({
  label,
  allLabel,
  options,
  active,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: TintFilterOption[];
  active: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <div className="category-filter-label">{label}</div>
      <div className="category-chip-row">
        <button
          type="button"
          className={`category-filter-chip${active === null ? " active" : ""}`}
          onClick={() => onChange(null)}
        >
          {allLabel}
        </button>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`category-filter-chip${active === opt.value ? " active" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
    <div className="category-filter-panel">
      <div className="category-filter-title">Filtrar productos</div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px" }}>
        Grupos, familias y tipos según tu catálogo de tintes.
      </p>

      {groups.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <FilterChipRow
            label="Grupo de color"
            allLabel="Todos"
            options={groups}
            active={activeGroup}
            onChange={onGroupChange}
          />
        </div>
      )}

      <div className="category-filter-grid">
        {families.length > 0 && (
          <FilterChipRow
            label="Familia"
            allLabel="Todas"
            options={families}
            active={activeFamily}
            onChange={onFamilyChange}
          />
        )}

        {types.length > 0 && (
          <FilterChipRow
            label="Tipo"
            allLabel="Todos"
            options={types}
            active={activeType}
            onChange={onTypeChange}
          />
        )}

        {subcategories.length > 0 && (
          <FilterChipRow
            label="Subcategoría"
            allLabel="Todas"
            options={subcategories}
            active={activeSubcategory}
            onChange={onSubcategoryChange}
          />
        )}
      </div>
    </div>
  );
}
