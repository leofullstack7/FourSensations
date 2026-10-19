"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAdminCoupon,
  createAdminCouponsBatch,
  deleteAdminCoupon,
  fetchAdminCouponDetail,
  fetchAdminCoupons,
  sendAdminCouponEmails,
  updateAdminCoupon,
  type AdminCoupon,
  type AdminCouponStats,
  type CouponUpsertPayload,
} from "@/lib/api/admin-coupons";
import { formatPrice } from "@/lib/format";

const THEMES = [
  { id: "rose", label: "Rosa" },
  { id: "gold", label: "Oro" },
  { id: "violet", label: "Violeta" },
  { id: "emerald", label: "Esmeralda" },
  { id: "midnight", label: "Medianoche" },
] as const;

type FormState = {
  code: string;
  name: string;
  description: string;
  type: CouponUpsertPayload["type"];
  value: string;
  minSubtotal: string;
  maxDiscount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perUserLimit: string;
  status: CouponUpsertPayload["status"];
  theme: CouponUpsertPayload["theme"];
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  description: "",
  type: "PERCENT",
  value: "15",
  minSubtotal: "",
  maxDiscount: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perUserLimit: "1",
  status: "ACTIVE",
  theme: "rose",
});

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(raw: string): string | null {
  if (!raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formToPayload(form: FormState): CouponUpsertPayload {
  return {
    code: form.code,
    name: form.name,
    description: form.description.trim() || null,
    type: form.type,
    value: form.type === "FREE_SHIPPING" ? 0 : Number(form.value) || 0,
    minSubtotal: form.minSubtotal.trim() ? Number(form.minSubtotal) : null,
    maxDiscount: form.maxDiscount.trim() ? Number(form.maxDiscount) : null,
    startsAt: localInputToIso(form.startsAt),
    endsAt: localInputToIso(form.endsAt),
    usageLimit: form.usageLimit.trim() ? Number(form.usageLimit) : null,
    perUserLimit: form.perUserLimit.trim() ? Number(form.perUserLimit) : null,
    status: form.status,
    theme: form.theme,
  };
}

function couponFromForm(c: AdminCoupon): FormState {
  return {
    code: c.code,
    name: c.name,
    description: c.description || "",
    type: c.type,
    value: String(c.value),
    minSubtotal: c.minSubtotal != null ? String(c.minSubtotal) : "",
    maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : "",
    startsAt: toLocalInput(c.startsAt),
    endsAt: toLocalInput(c.endsAt),
    usageLimit: c.usageLimit != null ? String(c.usageLimit) : "",
    perUserLimit: c.perUserLimit != null ? String(c.perUserLimit) : "",
    status: c.status,
    theme: (THEMES.find((t) => t.id === c.theme)?.id || "rose") as FormState["theme"],
  };
}

function valuePreview(form: FormState): string {
  if (form.type === "FREE_SHIPPING") return "Envío gratis";
  if (form.type === "PERCENT") return `${form.value || 0}% OFF`;
  const n = Number(form.value) || 0;
  return `−${formatPrice(n)}`;
}

function statusClass(status: string): string {
  return `fs-cp-pill fs-cp-pill--${status.toLowerCase()}`;
}

export function AdminCouponsPanel({
  active,
  showToast,
}: {
  active: boolean;
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [stats, setStats] = useState<AdminCouponStats>({
    total: 0,
    active: 0,
    free: 0,
    classic: 0,
    redemptions: 0,
    emails: 0,
  });
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "ACTIVE" | "PAUSED" | "DRAFT" | "EXPIRED" | "ARCHIVED">("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchKind, setBatchKind] = useState<"WELCOME" | "CLASSIC">("WELCOME");
  const [batchQty, setBatchQty] = useState("50");
  const [batchCode, setBatchCode] = useState("");
  const [batchName, setBatchName] = useState("");
  const [batchType, setBatchType] = useState<"PERCENT" | "FIXED" | "FREE_SHIPPING">("PERCENT");
  const [batchValue, setBatchValue] = useState("10");
  const [batchEndsAt, setBatchEndsAt] = useState("");
  const [batchBusy, setBatchBusy] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchAdminCouponDetail>> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmails, setSendEmails] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminCoupons();
      setCoupons(data.coupons);
      setStats(data.stats);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudieron cargar cupones", "danger", "⚠️");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return coupons.filter((c) => {
      if (filter !== "all" && c.effectiveStatus !== filter && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    });
  }, [coupons, filter, query]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      code: `FS${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    });
    setEditorOpen(true);
  };

  const openBatch = () => {
    setBatchKind("WELCOME");
    setBatchQty("50");
    setBatchCode("");
    setBatchName("");
    setBatchType("PERCENT");
    setBatchValue("10");
    setBatchEndsAt("");
    setBatchOpen(true);
  };

  const submitBatch = async () => {
    setBatchBusy(true);
    try {
      if (batchKind === "WELCOME") {
        const quantity = Math.max(1, Math.min(500, Number(batchQty) || 0));
        const res = await createAdminCouponsBatch({
          kind: "WELCOME",
          quantity,
          value: 10,
        });
        showToast(`Se crearon ${res.created} cupones iniciales libres`, "success", "🎟️");
      } else {
        if (!batchCode.trim()) {
          showToast("Indica el código del cupón clásico", "danger", "⚠️");
          return;
        }
        if (!batchEndsAt.trim()) {
          showToast("Indica la fecha de caducidad", "danger", "⚠️");
          return;
        }
        const ends = localInputToIso(batchEndsAt);
        if (!ends) {
          showToast("Fecha de caducidad inválida", "danger", "⚠️");
          return;
        }
        const res = await createAdminCouponsBatch({
          kind: "CLASSIC",
          code: batchCode.trim().toUpperCase(),
          name: batchName.trim() || undefined,
          type: batchType,
          value: batchType === "FREE_SHIPPING" ? 0 : Number(batchValue) || 0,
          endsAt: ends,
          perUserLimit: null,
        });
        showToast(`Cupón clásico ${res.code || batchCode} creado`, "success", "🎟️");
      }
      setBatchOpen(false);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudieron crear cupones", "danger", "⚠️");
    } finally {
      setBatchBusy(false);
    }
  };

  const openEdit = (c: AdminCoupon) => {
    setEditingId(c.id);
    setForm(couponFromForm(c));
    setEditorOpen(true);
  };

  const saveCoupon = async () => {
    setSaving(true);
    try {
      const payload = formToPayload(form);
      if (editingId) {
        await updateAdminCoupon(editingId, payload);
        showToast("Cupón actualizado", "success", "✨");
      } else {
        await createAdminCoupon(payload);
        showToast("Cupón creado", "success", "🎟️");
      }
      setEditorOpen(false);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "danger", "⚠️");
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async (c: AdminCoupon) => {
    try {
      const next = c.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      await updateAdminCoupon(c.id, { status: next });
      showToast(next === "ACTIVE" ? "Cupón activado" : "Cupón pausado", "success", "✓");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo cambiar estado", "danger", "⚠️");
    }
  };

  const removeCoupon = async (c: AdminCoupon) => {
    if (!window.confirm(c.redemptionCount > 0 ? "Tiene canjes: se archivará. ¿Continuar?" : `¿Eliminar ${c.code}?`)) {
      return;
    }
    try {
      await deleteAdminCoupon(c.id);
      showToast(c.redemptionCount > 0 ? "Cupón archivado" : "Cupón eliminado", "success", "🗑️");
      if (detailId === c.id) {
        setDetailId(null);
        setDetail(null);
      }
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo eliminar", "danger", "⚠️");
    }
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminCouponDetail(id));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo cargar detalle", "danger", "⚠️");
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openSend = (c: AdminCoupon) => {
    setDetailId(c.id);
    setSendEmails("");
    setSendSubject(`Tu cupón ${c.code} — Four Sensations`);
    setSendMessage("Quisimos consentirte con un detalle especial para tu próxima compra.");
    setSendOpen(true);
  };

  const doSend = async () => {
    if (!detailId) return;
    const recipients = sendEmails
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((email) => ({ email }));
    if (!recipients.length) {
      showToast("Agrega al menos un correo", "danger", "⚠️");
      return;
    }
    setSending(true);
    try {
      const res = await sendAdminCouponEmails(detailId, {
        recipients,
        subject: sendSubject,
        message: sendMessage,
      });
      showToast(`Enviados: ${res.sent}${res.failed ? ` · fallidos: ${res.failed}` : ""}`, res.failed ? "warning" : "success", "✉️");
      setSendOpen(false);
      await load();
      if (detailId) await openDetail(detailId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo enviar", "danger", "⚠️");
    } finally {
      setSending(false);
    }
  };

  if (!active) return null;

  return (
    <div className="fs-cp">
      <header className="fs-cp-hero">
        <div className="fs-cp-hero__glow" aria-hidden />
        <div className="fs-cp-hero__copy">
          <p className="fs-cp-kicker">Atelier de cupones</p>
          <h2 className="fs-cp-title">Códigos que se sienten como un regalo</h2>
          <p className="fs-cp-sub">
            Bolsa de cupones iniciales (libres → activos al reclamar) y cupones clásicos compartidos con fecha de
            caducidad.
          </p>
        </div>
        <div className="fs-cp-hero__actions">
          <button type="button" className="fs-cp-btn fs-cp-btn--primary" onClick={openBatch}>
            Crear cupones
          </button>
          <button type="button" className="fs-cp-btn" onClick={openCreate}>
            Cupón avanzado
          </button>
        </div>
      </header>

      <div className="fs-cp-stats">
        <div className="fs-cp-stat">
          <span>Cupones activos</span>
          <strong>{stats.active}</strong>
          <em>Iniciales ya asociados a un cliente</em>
        </div>
        <div className="fs-cp-stat">
          <span>Cupones libres</span>
          <strong>{stats.free ?? 0}</strong>
          <em>Iniciales listos para asignar</em>
        </div>
        <div className="fs-cp-stat">
          <span>Clásicos</span>
          <strong>{stats.classic ?? 0}</strong>
          <em>Códigos compartidos</em>
        </div>
        <div className="fs-cp-stat">
          <span>Canjes</span>
          <strong>{stats.redemptions}</strong>
        </div>
        <div className="fs-cp-stat">
          <span>Emails</span>
          <strong>{stats.emails}</strong>
        </div>
      </div>

      <div className="fs-cp-toolbar">
        <input
          className="fs-cp-input"
          placeholder="Buscar código o nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="fs-cp-filters">
          {(["all", "ACTIVE", "PAUSED", "DRAFT", "EXPIRED", "ARCHIVED"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`fs-cp-chip${filter === f ? " is-on" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Todos" : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="fs-cp-empty">Cargando cupones…</p>
      ) : filtered.length === 0 ? (
        <div className="fs-cp-empty-card">
          <p>Aún no hay cupones{query ? " con ese filtro" : ""}.</p>
          <button type="button" className="fs-cp-btn fs-cp-btn--primary" onClick={openCreate}>
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="fs-cp-grid">
          {filtered.map((c) => (
            <article key={c.id} className={`fs-cp-card fs-cp-card--${c.theme}`}>
              <div className="fs-cp-card__shine" aria-hidden />
              <div className="fs-cp-card__top">
                <span className={statusClass(c.effectiveStatus)}>{c.effectiveStatus}</span>
                <span className="fs-cp-card__type">
                  {c.kind === "WELCOME"
                    ? c.poolState === "libre"
                      ? "Inicial · libre"
                      : "Inicial · activo"
                    : c.typeLabel}
                </span>
              </div>
              <h3 className="fs-cp-card__code">{c.code}</h3>
              <p className="fs-cp-card__name">
                {c.name}
                {c.assignedEmail ? ` · ${c.assignedEmail}` : ""}
              </p>
              <p className="fs-cp-card__value">
                {c.type === "PERCENT"
                  ? `${c.value}%`
                  : c.type === "FIXED"
                    ? formatPrice(c.value)
                    : "Envío gratis"}
              </p>
              <div className="fs-cp-card__meta">
                <span>
                  Canjes {c.redemptionCount}
                  {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                </span>
                <span>Emails {c.emailSendCount}</span>
              </div>
              <div className="fs-cp-card__actions">
                <button type="button" onClick={() => void openDetail(c.id)}>
                  Ver canjes
                </button>
                <button type="button" onClick={() => openSend(c)}>
                  Enviar
                </button>
                <button type="button" onClick={() => openEdit(c)}>
                  Editar
                </button>
                <button type="button" onClick={() => void togglePause(c)}>
                  {c.status === "ACTIVE" ? "Pausar" : "Activar"}
                </button>
                <button type="button" className="is-danger" onClick={() => void removeCoupon(c)}>
                  Borrar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {batchOpen ? (
        <div className="fs-cp-modal" role="dialog" aria-modal="true">
          <div className="fs-cp-modal__panel">
            <div className="fs-cp-modal__head">
              <div>
                <p className="fs-cp-kicker">Bolsa de cupones</p>
                <h3>Crear cupones</h3>
              </div>
              <button type="button" className="fs-cp-icon-btn" onClick={() => setBatchOpen(false)} aria-label="Cerrar">
                ×
              </button>
            </div>

            <div className="fs-cp-batch-kinds" role="group" aria-label="Tipo de cupón">
              <button
                type="button"
                className={`fs-cp-chip${batchKind === "WELCOME" ? " is-on" : ""}`}
                onClick={() => setBatchKind("WELCOME")}
              >
                Iniciales (F1025S)
              </button>
              <button
                type="button"
                className={`fs-cp-chip${batchKind === "CLASSIC" ? " is-on" : ""}`}
                onClick={() => setBatchKind("CLASSIC")}
              >
                Clásicos (ej. DIASINIVA)
              </button>
            </div>

            {batchKind === "WELCOME" ? (
              <div className="fs-cp-form fs-cp-form--single">
                <p className="fs-cp-batch-hint">
                  Genera códigos únicos tipo <strong>F1025S</strong> al 10% OFF. Quedan en la bolsa de{" "}
                  <strong>libres</strong> hasta que una clienta los reclame desde el popup.
                </p>
                <label>
                  Cantidad a crear
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={batchQty}
                    onChange={(e) => setBatchQty(e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <div className="fs-cp-form">
                <p className="fs-cp-batch-hint fs-cp-span2">
                  Un mismo código para varias clientas. Pueden usarlo las veces que quieran hasta la caducidad.
                </p>
                <label>
                  Código
                  <input
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                    placeholder="DIASINIVA"
                  />
                </label>
                <label>
                  Nombre interno
                  <input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Día sin IVA" />
                </label>
                <label>
                  Tipo
                  <select
                    value={batchType}
                    onChange={(e) => setBatchType(e.target.value as typeof batchType)}
                  >
                    <option value="PERCENT">Porcentaje</option>
                    <option value="FIXED">Monto fijo (COP)</option>
                    <option value="FREE_SHIPPING">Envío gratis</option>
                  </select>
                </label>
                {batchType !== "FREE_SHIPPING" ? (
                  <label>
                    Valor
                    <input
                      type="number"
                      value={batchValue}
                      onChange={(e) => setBatchValue(e.target.value)}
                    />
                  </label>
                ) : (
                  <div />
                )}
                <label className="fs-cp-span2">
                  Caducidad
                  <input
                    type="datetime-local"
                    value={batchEndsAt}
                    onChange={(e) => setBatchEndsAt(e.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="fs-cp-modal__foot">
              <button type="button" className="fs-cp-btn" onClick={() => setBatchOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="fs-cp-btn fs-cp-btn--primary"
                disabled={batchBusy}
                onClick={() => void submitBatch()}
              >
                {batchBusy ? "Creando…" : "Crear cupones"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editorOpen ? (
        <div className="fs-cp-modal" role="dialog" aria-modal="true">
          <div className="fs-cp-modal__panel">
            <div className="fs-cp-modal__head">
              <div>
                <p className="fs-cp-kicker">{editingId ? "Editar" : "Crear"}</p>
                <h3>{editingId ? "Ajustar cupón" : "Nuevo cupón"}</h3>
              </div>
              <button type="button" className="fs-cp-icon-btn" onClick={() => setEditorOpen(false)} aria-label="Cerrar">
                ×
              </button>
            </div>

            <div className={`fs-cp-preview fs-cp-preview--${form.theme}`}>
              <span>{form.type === "FREE_SHIPPING" ? "Envío" : "Cupón"}</span>
              <strong>{form.code || "CODIGO"}</strong>
              <em>{valuePreview(form)}</em>
            </div>

            <div className="fs-cp-form">
              <label>
                Código
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </label>
              <label>
                Nombre interno
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </label>
              <label className="fs-cp-span2">
                Descripción
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <label>
                Tipo
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FormState["type"] }))}
                >
                  <option value="PERCENT">Porcentaje</option>
                  <option value="FIXED">Monto fijo (COP)</option>
                  <option value="FREE_SHIPPING">Envío gratis</option>
                </select>
              </label>
              {form.type !== "FREE_SHIPPING" ? (
                <label>
                  Valor
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </label>
              ) : (
                <div />
              )}
              <label>
                Mínimo de compra
                <input
                  type="number"
                  placeholder="Opcional"
                  value={form.minSubtotal}
                  onChange={(e) => setForm((f) => ({ ...f, minSubtotal: e.target.value }))}
                />
              </label>
              <label>
                Tope de descuento
                <input
                  type="number"
                  placeholder="Opcional"
                  value={form.maxDiscount}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                />
              </label>
              <label>
                Inicio
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </label>
              <label>
                Fin
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </label>
              <label>
                Límite global
                <input
                  type="number"
                  placeholder="Ilimitado"
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                />
              </label>
              <label>
                Por correo
                <input
                  type="number"
                  placeholder="1"
                  value={form.perUserLimit}
                  onChange={(e) => setForm((f) => ({ ...f, perUserLimit: e.target.value }))}
                />
              </label>
              <label>
                Estado
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))}
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="ACTIVE">Activo</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="EXPIRED">Expirado</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
              </label>
              <label>
                Tema visual
                <select
                  value={form.theme}
                  onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value as FormState["theme"] }))}
                >
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="fs-cp-modal__foot">
              <button type="button" className="fs-cp-btn" onClick={() => setEditorOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="fs-cp-btn fs-cp-btn--primary" disabled={saving} onClick={() => void saveCoupon()}>
                {saving ? "Guardando…" : "Guardar cupón"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailId && !sendOpen ? (
        <div className="fs-cp-modal" role="dialog" aria-modal="true">
          <div className="fs-cp-modal__panel fs-cp-modal__panel--wide">
            <div className="fs-cp-modal__head">
              <div>
                <p className="fs-cp-kicker">Actividad</p>
                <h3>{detail?.coupon.code || "Cupón"}</h3>
              </div>
              <button type="button" className="fs-cp-icon-btn" onClick={() => { setDetailId(null); setDetail(null); }} aria-label="Cerrar">
                ×
              </button>
            </div>
            {detailLoading || !detail ? (
              <p className="fs-cp-empty">Cargando…</p>
            ) : (
              <div className="fs-cp-detail">
                <section>
                  <h4>Quién canjeó</h4>
                  {detail.redemptions.length === 0 ? (
                    <p className="fs-cp-empty">Todavía no hay canjes.</p>
                  ) : (
                    <div className="fs-cp-table-wrap">
                      <table className="fs-cp-table">
                        <thead>
                          <tr>
                            <th>Cliente</th>
                            <th>Pedido</th>
                            <th>Descuento</th>
                            <th>Total</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.redemptions.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <strong>{r.customerName || "—"}</strong>
                                <br />
                                <span>{r.customerEmail}</span>
                              </td>
                              <td>{r.orderReference}</td>
                              <td>{formatPrice(r.discountAmount)}</td>
                              <td>{formatPrice(r.orderTotal)}</td>
                              <td>{new Date(r.redeemedAt).toLocaleString("es-CO")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
                <section>
                  <h4>Correos enviados</h4>
                  {detail.emailSends.length === 0 ? (
                    <p className="fs-cp-empty">Sin envíos aún.</p>
                  ) : (
                    <div className="fs-cp-table-wrap">
                      <table className="fs-cp-table">
                        <thead>
                          <tr>
                            <th>Para</th>
                            <th>Asunto</th>
                            <th>Estado</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.emailSends.map((s) => (
                            <tr key={s.id}>
                              <td>{s.toEmail}</td>
                              <td>{s.subject}</td>
                              <td>{s.status}{s.error ? ` · ${s.error}` : ""}</td>
                              <td>{new Date(s.sentAt).toLocaleString("es-CO")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {sendOpen ? (
        <div className="fs-cp-modal" role="dialog" aria-modal="true">
          <div className="fs-cp-modal__panel">
            <div className="fs-cp-modal__head">
              <div>
                <p className="fs-cp-kicker">Enviar por correo</p>
                <h3>Regalar el cupón</h3>
              </div>
              <button type="button" className="fs-cp-icon-btn" onClick={() => setSendOpen(false)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className="fs-cp-form fs-cp-form--single">
              <label>
                Destinatarios (uno por línea o separados por coma)
                <textarea rows={5} value={sendEmails} onChange={(e) => setSendEmails(e.target.value)} placeholder="cliente@correo.com" />
              </label>
              <label>
                Asunto
                <input value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
              </label>
              <label>
                Mensaje personal
                <textarea rows={4} value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} />
              </label>
            </div>
            <div className="fs-cp-modal__foot">
              <button type="button" className="fs-cp-btn" onClick={() => setSendOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="fs-cp-btn fs-cp-btn--primary" disabled={sending} onClick={() => void doSend()}>
                {sending ? "Enviando…" : "Enviar cupones"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
