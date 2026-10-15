"use client";

import { useCallback, useEffect, useState } from "react";
import { uploadAdminProductImage } from "@/lib/api/admin-upload";
import { LANDING_COLLAGE_SLUGS, normalizeLandingCollages, type LandingCollageSlug, type LandingCollages } from "@/lib/site-settings";

const LABELS: Record<LandingCollageSlug, string> = {
  "cuidado-capilar": "Cuidado capilar",
  "cuidado-corporal": "Cuidado corporal",
  accesorios: "Accesorios",
};

const SHOTS = ["fs-account-collage__shot--a", "fs-account-collage__shot--b", "fs-account-collage__shot--c"] as const;

type Props = {
  active: boolean;
  showToast: (msg: string, type?: string) => void;
};

export function AdminLandingContentPanel({ active, showToast }: Props) {
  const [section, setSection] = useState<LandingCollageSlug>("cuidado-capilar");
  const [collages, setCollages] = useState<LandingCollages | null>(null);
  const [busySlot, setBusySlot] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site-settings", { cache: "no-store", credentials: "include" });
    const data = (await res.json()) as { landingCollages?: unknown; error?: string };
    if (!res.ok) throw new Error(data.error || "No se pudo leer el contenido");
    setCollages(normalizeLandingCollages(data.landingCollages));
  }, []);

  useEffect(() => {
    if (!active) return;
    void load().catch((e) => showToast(e instanceof Error ? e.message : "No se pudo cargar", "danger"));
  }, [active, load, showToast]);

  const saveSlot = async (index: number, file: File) => {
    if (!collages) return;
    setBusySlot(index);
    try {
      const url = await uploadAdminProductImage(file);
      const next = normalizeLandingCollages({
        ...collages,
        [section]: collages[section].map((current, i) => (i === index ? url : current)),
      });
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landingCollages: next }),
      });
      const data = (await res.json()) as { landingCollages?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setCollages(normalizeLandingCollages(data.landingCollages));
      showToast("Foto actualizada", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo subir la foto", "danger");
    } finally {
      setBusySlot(null);
    }
  };

  const slots = collages?.[section] ?? ["", "", ""];

  return (
    <div className="admin-card" style={{ padding: 22 }}>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
        Elige la sección y cambia cualquiera de las 3 fotos del collage. Se publican en Bunny y se ven igual que en la tienda.
      </p>
      <div className="category-chip-row" style={{ marginBottom: 18 }}>
        {LANDING_COLLAGE_SLUGS.map((slug) => (
          <button
            key={slug}
            type="button"
            className={`category-filter-chip${section === slug ? " active" : ""}`}
            onClick={() => setSection(slug)}
          >
            {LABELS[slug]}
          </button>
        ))}
      </div>
      <div className="admin-landing-collage">
        <div className="fs-account-collage" aria-hidden={false}>
          <span className="fs-account-collage__orb fs-account-collage__orb--1" />
          <span className="fs-account-collage__orb fs-account-collage__orb--2" />
          <span className="fs-account-collage__bloom" />
          {slots.map((url, index) => (
            <figure key={`${section}-${index}`} className={`fs-account-collage__shot ${SHOTS[index]}`}>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" />
              ) : (
                <span className="admin-landing-collage__empty">Foto {index + 1}</span>
              )}
              <label className="admin-landing-collage__change">
                {busySlot === index ? "Subiendo…" : "Cambiar"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={busySlot != null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void saveSlot(index, file);
                  }}
                />
              </label>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
