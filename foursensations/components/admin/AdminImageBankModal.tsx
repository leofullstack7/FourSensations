"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api/admin-fetch";
import { uploadAdminImage } from "@/lib/api/admin-upload";

type BankImage = { url: string; source: string; createdAt?: string };

export function AdminImageBankModal({
  onClose,
  onPick,
  title = "Banco de imágenes",
}: {
  onClose: () => void;
  onPick: (url: string) => void;
  title?: string;
}) {
  const [images, setImages] = useState<BankImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/media-bank", { cache: "no-store" });
      const data = (await res.json()) as { images?: BankImage[]; error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo cargar el banco");
      setImages(data.images || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = q.trim()
    ? images.filter((i) => i.url.toLowerCase().includes(q.trim().toLowerCase()) || i.source.includes(q.trim().toLowerCase()))
    : images;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(40,18,28,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(920px, 96vw)",
          maxHeight: "88vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "#fffafb",
          borderRadius: 20,
          border: "1px solid rgba(196,84,122,0.2)",
          boxShadow: "0 24px 60px rgba(60,24,40,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid rgba(200,140,160,0.25)" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#c4547a", fontWeight: 700 }}>
              Media
            </p>
            <h3 style={{ margin: "2px 0 0", fontSize: 18, color: "#4a2a38" }}>{title}</h3>
          </div>
          <label className="btn btn-outline btn-sm" style={{ cursor: uploading ? "wait" : "pointer" }}>
            {uploading ? "Subiendo…" : "⬆ Subir nueva"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setUploading(true);
                void (async () => {
                  try {
                    const result = await uploadAdminImage(f);
                    onPick(result.url);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Error al subir");
                  } finally {
                    setUploading(false);
                  }
                })();
              }}
            />
          </label>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div style={{ padding: "10px 18px" }}>
          <input
            className="form-input"
            placeholder="Filtrar por URL o fuente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "8px 18px 18px" }}>
          {loading ? (
            <p style={{ color: "#8a6a72" }}>Cargando banco…</p>
          ) : error ? (
            <p style={{ color: "#c4547a" }}>{error}</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "#8a6a72" }}>No hay imágenes aún. Sube la primera.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))",
                gap: 10,
              }}
            >
              {filtered.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => onPick(img.url)}
                  title={img.url}
                  style={{
                    border: "1px solid rgba(200,140,160,0.3)",
                    borderRadius: 12,
                    overflow: "hidden",
                    padding: 0,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                  />
                  <span
                    style={{
                      display: "block",
                      fontSize: 10,
                      padding: "4px 6px",
                      color: "#8a6a72",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {img.source}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
