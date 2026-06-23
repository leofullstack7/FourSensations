"use client";

import { useMemo } from "react";
import type { AdminCategoryTree } from "@/lib/types/admin-category";
import { listVariantsInGroup } from "@/lib/admin/variant-groups";
import { formatPrice } from "@/lib/format";
import type { AdminProduct } from "@/lib/types/admin";
import { isHttpImageUrl } from "@/lib/util/image-url";

function VariantThumb({ imageUrl, emoji }: { imageUrl: string | null; emoji: string }) {
  return (
    <div className="table-product-img" style={{ width: 72, height: 72, flexShrink: 0 }}>
      {isHttpImageUrl(imageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl!} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        emoji || "📦"
      )}
    </div>
  );
}

type Props = {
  open: boolean;
  anchorProduct: AdminProduct | null;
  allProducts: AdminProduct[];
  categoryTree: AdminCategoryTree[];
  deletingId: string | null;
  onClose: () => void;
  onDeleteVariant: (id: string) => void | Promise<void>;
  categoryDisplayName: (slug: string, tree: AdminCategoryTree[]) => string;
};

export function AdminProductVariantsModal({
  open,
  anchorProduct,
  allProducts,
  categoryTree,
  deletingId,
  onClose,
  onDeleteVariant,
  categoryDisplayName,
}: Props) {
  const variants = useMemo(() => {
    if (!anchorProduct?.variantGroupCode?.trim()) return [];
    return listVariantsInGroup(allProducts, anchorProduct.variantGroupCode);
  }, [anchorProduct, allProducts]);

  if (!open || !anchorProduct || variants.length < 2) return null;

  const groupLabel = anchorProduct.variantGroupCode?.trim() ?? "—";

  return (
    <div
      className={`admin-modal-overlay${open ? " open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className="admin-modal" style={{ maxWidth: 920, maxHeight: "90vh", overflow: "auto" }}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--dark)",
            marginBottom: 6,
          }}
        >
          Variantes del producto
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
          Grupo <strong>{groupLabel}</strong> · {variants.length} variante(s)
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {variants.map((v) => {
            const isPrimary = (v.variantGroupOrder ?? 0) === 0;
            const gallery = v.images ?? [];
            return (
              <div
                key={v.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 14,
                  background: "var(--ivory)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px 1fr auto",
                    gap: 14,
                    alignItems: "start",
                  }}
                >
                  <VariantThumb imageUrl={v.imageUrl} emoji={v.emoji} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, color: "var(--dark)", fontSize: 15 }}>{v.name}</span>
                      {isPrimary && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "var(--blush)",
                            color: "var(--dark)",
                          }}
                        >
                          Principal
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                      Código: <strong>{v.externalRef ?? "—"}</strong>
                      {v.variantGroupOrder != null && (
                        <span style={{ marginLeft: 10 }}>Orden: {v.variantGroupOrder + 1}</span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 8,
                        fontSize: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Valor: </span>
                        <strong>{formatPrice(v.price)}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Categoría: </span>
                        {categoryDisplayName(v.category, categoryTree)}
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)" }}>Subcategoría: </span>
                        {v.subcategory || "—"}
                      </div>
                    </div>
                    {(v.tags?.length ?? 0) > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {v.tags.map((tag) => (
                          <span
                            key={`${v.id}-${tag}`}
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "white",
                              border: "1px solid var(--line)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {(v.imageUrl || gallery.length > 0) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        {v.imageUrl && isHttpImageUrl(v.imageUrl) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.imageUrl}
                            alt=""
                            style={{
                              width: 44,
                              height: 44,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1px solid var(--line)",
                            }}
                          />
                        )}
                        {gallery.map((img) =>
                          isHttpImageUrl(img.url) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={img.id}
                              src={img.url}
                              alt=""
                              style={{
                                width: 44,
                                height: 44,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid var(--line)",
                              }}
                            />
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-table danger"
                    disabled={deletingId === v.id}
                    onClick={() => void onDeleteVariant(v.id)}
                    title="Eliminar esta variante"
                  >
                    {deletingId === v.id ? "…" : "🗑️"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
