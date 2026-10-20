"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminImageBankModal } from "@/components/admin/AdminImageBankModal";
import { adminFetch } from "@/lib/api/admin-fetch";
import { uploadAdminImage, type AdminUploadResult } from "@/lib/api/admin-upload";
import { CATEGORY_SHOWCASE_ITEMS } from "@/lib/category-showcase";
import {
  HOME_CONTENT_IMAGE_SPECS,
  HOME_PROMO_WIDGET_KEYS,
  HOME_PROMO_WIDGET_LABELS,
  normalizeHomeContent,
  type HomeContentSettings,
  type HomePromoWidgetKey,
} from "@/lib/home-content";
import {
  LANDING_COLLAGE_SLUGS,
  normalizeLandingCollages,
  type LandingCollageSlug,
  type LandingCollages,
} from "@/lib/site-settings";

const COLLAGE_LABELS: Record<LandingCollageSlug, string> = {
  "cuidado-capilar": "Cuidado capilar",
  "cuidado-corporal": "Cuidado corporal",
  kits: "Kits",
  accesorios: "Accesorios",
};

const SHOTS = ["fs-account-collage__shot--a", "fs-account-collage__shot--b", "fs-account-collage__shot--c"] as const;

type TabId = "guide" | "showcase" | "widgets" | "collages";

type Props = {
  active: boolean;
  showToast: (msg: string, type?: string) => void;
};

function SpecCard({
  title,
  size,
  ratio,
  hint,
}: {
  title: string;
  size: string;
  ratio: string;
  hint: string;
}) {
  return (
    <article
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(200,168,162,0.35)",
        background: "linear-gradient(180deg, #fff 0%, #faf7f4 100%)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45 }}>
        <strong>Tamaño recomendado:</strong> {size}
        <br />
        <strong>Proporción:</strong> {ratio}
        <br />
        {hint}
        <br />
        Formato: JPG/PNG/WebP (se convierte a WebP al subir).
      </div>
    </article>
  );
}

function formatKb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toastForUpload(result: AdminUploadResult): string {
  if (!result.optimized || result.beforeBytes <= result.afterBytes) {
    return "Imagen publicada (WebP)";
  }
  const saved = result.beforeBytes - result.afterBytes;
  const pct = Math.round((saved / result.beforeBytes) * 100);
  return `Publicada en WebP · ${formatKb(result.beforeBytes)} → ${formatKb(result.afterBytes)} (−${pct}%)`;
}

function ImageSlot({
  label,
  url,
  busy,
  onPick,
  onPickUrl,
  aspect = "4 / 5",
}: {
  label: string;
  url: string;
  busy: boolean;
  onPick: (file: File) => void;
  onPickUrl?: (url: string) => void;
  aspect?: string;
}) {
  const [bankOpen, setBankOpen] = useState(false);
  return (
    <div
      style={{
        border: "1px solid rgba(200,168,162,0.3)",
        borderRadius: 14,
        overflow: "hidden",
        background: "var(--ivory, #faf7f4)",
      }}
    >
      <div style={{ aspectRatio: aspect, position: "relative", background: "#eee" }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: 12 }}>
            Sin imagen
          </div>
        )}
      </div>
      <div style={{ padding: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{label}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label className="btn btn-outline btn-sm" style={{ width: "100%", cursor: busy ? "wait" : "pointer" }}>
            {busy ? "Optimizando a WebP…" : url ? "Subir nueva" : "Subir foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp"
              disabled={busy}
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onPick(file);
              }}
            />
          </label>
          {onPickUrl ? (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={busy}
              style={{ width: "100%" }}
              onClick={() => setBankOpen(true)}
            >
              🗂️ Banco de imágenes
            </button>
          ) : null}
        </div>
      </div>
      {bankOpen && onPickUrl ? (
        <AdminImageBankModal
          onClose={() => setBankOpen(false)}
          onPick={(picked) => {
            onPickUrl(picked);
            setBankOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

export function AdminLandingContentPanel({ active, showToast }: Props) {
  const [tab, setTab] = useState<TabId>("guide");
  const [section, setSection] = useState<LandingCollageSlug>("cuidado-capilar");
  const [collages, setCollages] = useState<LandingCollages | null>(null);
  const [homeContent, setHomeContent] = useState<HomeContentSettings | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [collageBankIndex, setCollageBankIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch("/api/admin/site-settings", { cache: "no-store", credentials: "include" });
    const data = (await res.json()) as {
      landingCollages?: unknown;
      homeContent?: unknown;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error || "No se pudo leer el contenido");
    setCollages(normalizeLandingCollages(data.landingCollages));
    setHomeContent(normalizeHomeContent(data.homeContent));
  }, []);

  useEffect(() => {
    if (!active) return;
    void load().catch((e) => showToast(e instanceof Error ? e.message : "No se pudo cargar", "danger"));
  }, [active, load, showToast]);

  const saveHomeContent = async (
    next: HomeContentSettings,
    key: string,
    uploadMeta?: AdminUploadResult,
  ) => {
    setBusyKey(key);
    try {
      const res = await adminFetch("/api/admin/site-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeContent: next }),
      });
      const data = (await res.json()) as { homeContent?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setHomeContent(normalizeHomeContent(data.homeContent));
      showToast(uploadMeta ? toastForUpload(uploadMeta) : "Imagen publicada", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "danger");
    } finally {
      setBusyKey(null);
    }
  };

  const uploadShowcase = async (label: string, file: File) => {
    if (!homeContent) return;
    setBusyKey(`showcase:${label}`);
    try {
      const uploaded = await uploadAdminImage(file);
      await saveHomeContent(
        {
          ...homeContent,
          showcaseImages: { ...homeContent.showcaseImages, [label]: uploaded.url },
        },
        `showcase:${label}`,
        uploaded,
      );
    } catch (e) {
      setBusyKey(null);
      showToast(e instanceof Error ? e.message : "No se pudo subir", "danger");
    }
  };

  const uploadPromo = async (key: HomePromoWidgetKey, file: File) => {
    if (!homeContent) return;
    setBusyKey(`promo:${key}`);
    try {
      const uploaded = await uploadAdminImage(file);
      await saveHomeContent(
        {
          ...homeContent,
          promoWidgets: { ...homeContent.promoWidgets, [key]: uploaded.url },
        },
        `promo:${key}`,
        uploaded,
      );
    } catch (e) {
      setBusyKey(null);
      showToast(e instanceof Error ? e.message : "No se pudo subir", "danger");
    }
  };

  const applyCollageUrl = async (index: number, url: string, uploadMeta?: AdminUploadResult) => {
    if (!collages) return;
    setBusyKey(`collage:${section}:${index}`);
    try {
      const next = normalizeLandingCollages({
        ...collages,
        [section]: collages[section].map((current, i) => (i === index ? url : current)),
      });
      const res = await adminFetch("/api/admin/site-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landingCollages: next }),
      });
      const data = (await res.json()) as { landingCollages?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setCollages(normalizeLandingCollages(data.landingCollages));
      showToast(uploadMeta ? toastForUpload(uploadMeta) : "Imagen actualizada", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar la foto", "danger");
    } finally {
      setBusyKey(null);
    }
  };

  const saveCollageSlot = async (index: number, file: File) => {
    if (!collages) return;
    setBusyKey(`collage:${section}:${index}`);
    try {
      const uploaded = await uploadAdminImage(file);
      await applyCollageUrl(index, uploaded.url, uploaded);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo subir la foto", "danger");
      setBusyKey(null);
    }
  };

  const applyShowcaseUrl = async (label: string, url: string, uploadMeta?: AdminUploadResult) => {
    if (!homeContent) return;
    await saveHomeContent(
      {
        ...homeContent,
        showcaseImages: { ...homeContent.showcaseImages, [label]: url },
      },
      `showcase:${label}`,
      uploadMeta,
    );
  };

  const applyPromoUrl = async (key: HomePromoWidgetKey, url: string, uploadMeta?: AdminUploadResult) => {
    if (!homeContent) return;
    await saveHomeContent(
      {
        ...homeContent,
        promoWidgets: { ...homeContent.promoWidgets, [key]: url },
      },
      `promo:${key}`,
      uploadMeta,
    );
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "guide", label: "Tamaños recomendados" },
    { id: "showcase", label: "Subcategorías Home" },
    { id: "widgets", label: "Widgets Home" },
    { id: "collages", label: "Collages de categoría" },
  ];

  const collageSlots = collages?.[section] ?? ["", "", ""];

  return (
    <div className="admin-card" style={{ padding: 22 }}>
      <h2 className="admin-card-title" style={{ marginTop: 0, marginBottom: 8 }}>
        Contenido de la tienda
      </h2>
      <p style={{ marginTop: 0, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
        Cambia las imágenes del home y de las landings. Al subir, el sistema las{" "}
        <strong>optimiza y convierte a WebP</strong> (máx. 1920&nbsp;px) para que la tienda cargue más rápido.
        Usa las medidas recomendadas para que se vean nítidas en móvil y escritorio.
      </p>

      <div className="category-chip-row" style={{ marginBottom: 18 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`category-filter-chip${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "guide" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {HOME_CONTENT_IMAGE_SPECS.map((spec) => (
            <SpecCard key={spec.id} title={spec.title} size={spec.size} ratio={spec.ratio} hint={spec.hint} />
          ))}
        </div>
      ) : null}

      {tab === "showcase" ? (
        <>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>
            Cards de <strong>Subcategorías</strong> bajo el hero. Recomendado: <strong>840 × 1040 px</strong> (vertical 4:5).
          </p>
          {!homeContent ? (
            <p>Cargando…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {CATEGORY_SHOWCASE_ITEMS.map((item) => (
                <ImageSlot
                  key={item.label}
                  label={item.displayName}
                  url={homeContent.showcaseImages[item.label] || item.image}
                  busy={busyKey === `showcase:${item.label}`}
                  onPick={(file) => void uploadShowcase(item.label, file)}
                  onPickUrl={(url) => void applyShowcaseUrl(item.label, url)}
                  aspect="4 / 5"
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {tab === "widgets" ? (
        <>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>
            Widgets horizontales del home. Categorías: <strong>1600 × 900 px</strong>. Trío Catálogo/IG/Marca:{" "}
            <strong>900 × 1200 px</strong>.
          </p>
          {!homeContent ? (
            <p>Cargando…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {HOME_PROMO_WIDGET_KEYS.map((key) => {
                const isDiagonal = key === "catalogo" || key === "instagram" || key === "marca";
                return (
                  <ImageSlot
                    key={key}
                    label={HOME_PROMO_WIDGET_LABELS[key]}
                    url={homeContent.promoWidgets[key] || ""}
                    busy={busyKey === `promo:${key}`}
                    onPick={(file) => void uploadPromo(key, file)}
                    onPickUrl={(url) => void applyPromoUrl(key, url)}
                    aspect={isDiagonal ? "3 / 4" : "16 / 9"}
                  />
                );
              })}
            </div>
          )}
        </>
      ) : null}

      {tab === "collages" ? (
        <>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>
            Collage del hero en cada categoría. Recomendado: <strong>1200 × 1500 px</strong> por foto.
          </p>
          <div className="category-chip-row" style={{ marginBottom: 18 }}>
            {LANDING_COLLAGE_SLUGS.map((slug) => (
              <button
                key={slug}
                type="button"
                className={`category-filter-chip${section === slug ? " active" : ""}`}
                onClick={() => setSection(slug)}
              >
                {COLLAGE_LABELS[slug]}
              </button>
            ))}
          </div>
          <div className="admin-landing-collage">
            <div className="fs-account-collage" aria-hidden={false}>
              <span className="fs-account-collage__orb fs-account-collage__orb--1" />
              <span className="fs-account-collage__orb fs-account-collage__orb--2" />
              <span className="fs-account-collage__bloom" />
              {collageSlots.map((url, index) => (
                <figure key={`${section}-${index}`} className={`fs-account-collage__shot ${SHOTS[index]}`}>
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" />
                  ) : (
                    <span className="admin-landing-collage__empty">Foto {index + 1}</span>
                  )}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>
                    <label className="admin-landing-collage__change">
                      {busyKey === `collage:${section}:${index}` ? "Optimizando…" : "Subir"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp"
                        disabled={busyKey != null}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void saveCollageSlot(index, file);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busyKey != null}
                      onClick={() => setCollageBankIndex(index)}
                    >
                      Banco
                    </button>
                  </div>
                </figure>
              ))}
            </div>
            {section === "accesorios" ? (
              <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                Estas tres fotos alimentan el collage de la landing <strong>Accesorios</strong>. También puedes
                cambiar el widget «Accesorios capilares» en la pestaña Widgets Home.
              </p>
            ) : null}
          </div>
          {collageBankIndex != null ? (
            <AdminImageBankModal
              onClose={() => setCollageBankIndex(null)}
              onPick={(url) => {
                const idx = collageBankIndex;
                setCollageBankIndex(null);
                void applyCollageUrl(idx, url);
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
