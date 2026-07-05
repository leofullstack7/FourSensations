"use client";

import { useMemo, useState } from "react";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import {
  buildMenuConfigFromTree,
  menuTagOptionsFromTree,
  MENU_TAG_CUSTOM_VALUE,
  resolveMenuTagFromEditor,
} from "@/lib/admin/menu-utils";
import {
  reorderAdminCategories,
  reorderAdminSubcategories,
  updateAdminCategory,
  updateAdminSubcategory,
} from "@/lib/api/admin-categories";

type ShowToast = (msg: string, type?: string, icon?: string) => void;

type AdminMenuTabProps = {
  tree: AdminCategoryTree[];
  loading: boolean;
  error: string | null;
  onReload: () => void;
  showToast: ShowToast;
  onGoCategories?: () => void;
};

function menuTagEditorState(
  tree: AdminCategoryTree[],
  categorySlug: string,
  currentTag: string | null
): { presets: string[]; select: string; custom: string } {
  const presets = menuTagOptionsFromTree(tree, categorySlug, "");
  const tag = (currentTag?.trim() || "General").trim();
  if (presets.length === 0) {
    return { presets, select: "", custom: currentTag?.trim() ?? "" };
  }
  if (presets.some((p) => p.toLowerCase() === tag.toLowerCase())) {
    return { presets, select: tag, custom: "" };
  }
  return { presets, select: MENU_TAG_CUSTOM_VALUE, custom: tag };
}

export function AdminMenuTab({
  tree,
  loading,
  error,
  onReload,
  showToast,
  onGoCategories,
}: AdminMenuTabProps) {
  const sortedTree = useMemo(
    () => [...tree].sort((a, b) => a.sortOrder - b.sortOrder),
    [tree]
  );
  const { config: menuConfig, slugByCategoryName } = useMemo(
    () => buildMenuConfigFromTree(sortedTree),
    [sortedTree]
  );

  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubMenuTagSelect, setEditSubMenuTagSelect] = useState("");
  const [editSubMenuTagCustom, setEditSubMenuTagCustom] = useState("");
  const [saving, setSaving] = useState(false);

  const beginEditCategory = (cat: AdminCategoryTree) => {
    setEditCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon ?? "");
    setEditSubId(null);
  };

  const beginEditSub = (cat: AdminCategoryTree, subId: string, subName: string, menuTag: string | null) => {
    const sub = cat.subcategories.find((s) => s.id === subId);
    if (!sub) return;
    setEditSubId(subId);
    setEditSubName(subName);
    const { select, custom } = menuTagEditorState(tree, cat.slug, menuTag);
    setEditSubMenuTagSelect(select);
    setEditSubMenuTagCustom(custom);
    setEditCatId(null);
  };

  const moveCategory = async (id: string, delta: -1 | 1) => {
    const ids = sortedTree.map((c) => c.id);
    const idx = ids.indexOf(id);
    const swap = idx + delta;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    setSaving(true);
    try {
      await reorderAdminCategories(ids);
      showToast("Orden de categorías actualizado", "success", "✅");
      onReload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al reordenar", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  const moveSubcategory = async (cat: AdminCategoryTree, subId: string, delta: -1 | 1) => {
    const subs = [...cat.subcategories].sort((a, b) => a.sortOrder - b.sortOrder);
    const ids = subs.map((s) => s.id);
    const idx = ids.indexOf(subId);
    const swap = idx + delta;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    setSaving(true);
    try {
      await reorderAdminSubcategories(cat.id, ids);
      showToast("Orden de subcategorías actualizado", "success", "✅");
      onReload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al reordenar", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async (cat: AdminCategoryTree) => {
    const name = editCatName.trim();
    if (!name) {
      showToast("El nombre no puede estar vacío", "danger", "⚠️");
      return;
    }
    setSaving(true);
    try {
      await updateAdminCategory(cat.id, {
        name,
        icon: editCatIcon.trim() || null,
      });
      showToast("Categoría actualizada en todo el sitio", "success", "✅");
      setEditCatId(null);
      onReload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al guardar", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  const saveSubcategory = async (cat: AdminCategoryTree, subId: string) => {
    const name = editSubName.trim();
    if (!name) {
      showToast("El nombre no puede estar vacío", "danger", "⚠️");
      return;
    }
    const presets = menuTagOptionsFromTree(tree, cat.slug, "");
    const menuTagRaw = resolveMenuTagFromEditor(
      presets,
      editSubMenuTagSelect,
      editSubMenuTagCustom
    );
    setSaving(true);
    try {
      await updateAdminSubcategory(subId, {
        name,
        menuTag: menuTagRaw || null,
      });
      showToast("Subcategoría actualizada en todo el sitio", "success", "✅");
      setEditSubId(null);
      onReload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al guardar", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div className="admin-card-title">Vista previa del menú de la tienda</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px", maxWidth: 820 }}>
          Esta vista refleja exactamente el mega menú público. Los datos provienen de la misma base que la sección{" "}
          <strong>Categorías</strong>. Al renombrar aquí, el cambio se aplica en la tienda, filtros y productos vinculados.
        </p>
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Cargando menú…</p>
        ) : error ? (
          <p style={{ fontSize: 13, color: "var(--danger, #c44)" }}>{error}</p>
        ) : sortedTree.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            No hay categorías.{" "}
            {onGoCategories ? (
              <button type="button" className="btn-table" onClick={onGoCategories}>
                Ir a Categorías
              </button>
            ) : (
              "Créalas en la sección Categorías."
            )}
          </p>
        ) : (
          <div className="admin-mega-preview">
            <div className="admin-mega-preview-nav">
              {Object.entries(menuConfig).map(([cat, data]) => (
                <span key={cat} className="admin-mega-preview-pill">
                  {data.icon} {cat}
                </span>
              ))}
            </div>
            <div className="admin-mega-preview-panels">
              {Object.entries(menuConfig).map(([cat, data]) => {
                const subKeys = Object.keys(data.subs);
                return (
                  <div key={cat} className="admin-mega-preview-panel">
                    <div className="admin-mega-preview-header">{cat}</div>
                    <div
                      className={`admin-mega-preview-grid${
                        subKeys.length <= 2 ? " cols-2" : subKeys.length >= 4 ? " cols-4" : ""
                      }`}
                    >
                      {Object.entries(data.subs).map(([group, items]) => (
                        <div key={group} className="admin-mega-preview-col">
                          <div className="admin-mega-preview-col-title">{group}</div>
                          {items.map((item) => (
                            <div key={item} className="admin-mega-preview-link">
                              <span className="dot" />
                              {item}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="admin-mega-preview-slug">
                      URL: /categoria/{slugByCategoryName[cat] ?? "…"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="admin-card">
        <div className="admin-card-title">Editar estructura del menú</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 14px", maxWidth: 820 }}>
          Usa las flechas para ordenar. Para crear o eliminar categorías y subcategorías, ve a{" "}
          {onGoCategories ? (
            <button type="button" className="btn-table" onClick={onGoCategories}>
              Categorías
            </button>
          ) : (
            "Categorías"
          )}
          .
        </p>

        {sortedTree.length === 0 ? null : (
          <div className="menu-tree">
            {sortedTree.map((cat, catIdx) => {
              const subs = [...cat.subcategories].sort((a, b) => a.sortOrder - b.sortOrder);
              return (
                <div key={cat.id} className="menu-cat-row">
                  <div className="menu-cat-header">
                    <div className="menu-cat-name">
                      {editCatId === cat.id ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            type="text"
                            className="form-input"
                            value={editCatName}
                            onChange={(e) => setEditCatName(e.target.value)}
                            style={{ maxWidth: 220 }}
                            aria-label="Nombre de categoría"
                          />
                          <input
                            type="text"
                            className="form-input"
                            value={editCatIcon}
                            onChange={(e) => setEditCatIcon(e.target.value)}
                            placeholder="Emoji"
                            style={{ maxWidth: 72 }}
                            aria-label="Icono"
                          />
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={saving}
                            onClick={() => void saveCategory(cat)}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            disabled={saving}
                            onClick={() => setEditCatId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{cat.icon ?? "📦"}</span>
                          <span>{cat.name}</span>
                        </>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        type="button"
                        className="btn-table"
                        title="Subir categoría"
                        disabled={saving || catIdx === 0}
                        onClick={() => void moveCategory(cat.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-table"
                        title="Bajar categoría"
                        disabled={saving || catIdx === sortedTree.length - 1}
                        onClick={() => void moveCategory(cat.id, 1)}
                      >
                        ↓
                      </button>
                      {editCatId !== cat.id && (
                        <button
                          type="button"
                          className="btn-table"
                          disabled={saving}
                          onClick={() => beginEditCategory(cat)}
                        >
                          ✏️ Renombrar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="menu-cat-subs admin-menu-sub-list">
                    {subs.length === 0 ? (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Sin subcategorías</span>
                    ) : (
                      subs.map((s, subIdx) => {
                        const group = (s.menuTag?.trim() || "General").trim();
                        const isEditing = editSubId === s.id;
                        return (
                          <div key={s.id} className="admin-menu-sub-row">
                            {isEditing ? (
                              <div className="admin-menu-sub-edit">
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editSubName}
                                  onChange={(e) => setEditSubName(e.target.value)}
                                  placeholder="Nombre"
                                  style={{ maxWidth: 180 }}
                                />
                                {(() => {
                                  const presets = menuTagOptionsFromTree(tree, cat.slug, "");
                                  if (presets.length === 0) {
                                    return (
                                      <input
                                        type="text"
                                        className="form-input"
                                        value={editSubMenuTagCustom}
                                        onChange={(e) => setEditSubMenuTagCustom(e.target.value)}
                                        placeholder="Etiqueta menú"
                                        style={{ maxWidth: 160 }}
                                      />
                                    );
                                  }
                                  return (
                                    <>
                                      <select
                                        className="form-select"
                                        style={{ minWidth: 140, maxWidth: 180 }}
                                        value={editSubMenuTagSelect}
                                        onChange={(e) => setEditSubMenuTagSelect(e.target.value)}
                                      >
                                        <option value="">Sin etiqueta</option>
                                        {presets.map((o) => (
                                          <option key={o} value={o}>
                                            {o}
                                          </option>
                                        ))}
                                        <option value={MENU_TAG_CUSTOM_VALUE}>Otra…</option>
                                      </select>
                                      {editSubMenuTagSelect === MENU_TAG_CUSTOM_VALUE && (
                                        <input
                                          type="text"
                                          className="form-input"
                                          value={editSubMenuTagCustom}
                                          onChange={(e) => setEditSubMenuTagCustom(e.target.value)}
                                          placeholder="Grupo menú"
                                          style={{ maxWidth: 140 }}
                                        />
                                      )}
                                    </>
                                  );
                                })()}
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={saving}
                                  onClick={() => void saveSubcategory(cat, s.id)}
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  disabled={saving}
                                  onClick={() => setEditSubId(null)}
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="sub-chip">
                                  <span>{s.name}</span>
                                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({group})</span>
                                </div>
                                <div className="admin-menu-sub-actions">
                                  <button
                                    type="button"
                                    className="btn-table"
                                    title="Subir"
                                    disabled={saving || subIdx === 0}
                                    onClick={() => void moveSubcategory(cat, s.id, -1)}
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-table"
                                    title="Bajar"
                                    disabled={saving || subIdx === subs.length - 1}
                                    onClick={() => void moveSubcategory(cat, s.id, 1)}
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-table"
                                    disabled={saving}
                                    onClick={() => beginEditSub(cat, s.id, s.name, s.menuTag)}
                                  >
                                    ✏️
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
