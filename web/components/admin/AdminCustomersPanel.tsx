"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAdminCustomers, sendAdminCustomerEmail } from "@/lib/api/admin-customers";
import {
  buildWhatsappPromoMessage,
  type AdminCustomerRecord,
  whatsappUrl,
} from "@/lib/admin/customer-crm";
import { formatPrice } from "@/lib/format";

const EMAIL_TEMPLATES = [
  {
    label: "Promoción general",
    subject: "✨ Novedades y promociones en GinnaBeauty",
    body: "Queremos contarte que tenemos promociones especiales y productos nuevos en nuestro catálogo. Si deseas, podemos ayudarte a armar un pedido a tu medida con envío a todo Colombia.",
  },
  {
    label: "Programa mayorista",
    subject: "📦 Tu acceso al programa mayorista GinnaBeauty",
    body: "Vimos que realizaste compras con nosotras y queremos invitarte al programa mayorista GinnaBeauty. Con pedidos desde $700.000 accedes a precios exclusivos y acompañamiento personal de nuestro equipo.",
  },
  {
    label: "Recompra",
    subject: "💕 ¿Lista para tu próximo pedido en GinnaBeauty?",
    body: "Gracias por confiar en GinnaBeauty. Tenemos productos destacados que podrían interesarte para tu próxima compra. Escríbenos si quieres recomendaciones personalizadas.",
  },
] as const;

function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function formatOrderDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function AdminCustomersPanel({
  active,
  showToast,
}: {
  active: boolean;
  showToast: (msg: string, type?: string, icon?: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<AdminCustomerRecord[]>([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    registeredCount: 0,
    guestCount: 0,
    wholesaleEligibleCount: 0,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "registered" | "guest" | "wholesale">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emailTarget, setEmailTarget] = useState<AdminCustomerRecord | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminCustomers();
      setCustomers(data.customers);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (filter === "registered" && !c.isRegistered) return false;
      if (filter === "guest" && c.isRegistered) return false;
      if (filter === "wholesale" && !c.isWholesaleEligible) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q)
      );
    });
  }, [customers, search, filter]);

  const openEmailModal = (customer: AdminCustomerRecord) => {
    setEmailTarget(customer);
    setEmailSubject(EMAIL_TEMPLATES[0].subject);
    setEmailBody(EMAIL_TEMPLATES[0].body);
  };

  const applyTemplate = (idx: number) => {
    const t = EMAIL_TEMPLATES[idx];
    if (!t) return;
    setEmailSubject(t.subject);
    setEmailBody(t.body);
  };

  const handleSendEmail = async () => {
    if (!emailTarget) return;
    setEmailSending(true);
    try {
      await sendAdminCustomerEmail({
        to: emailTarget.email,
        customerName: emailTarget.name,
        subject: emailSubject,
        body: emailBody,
      });
      showToast(`Correo enviado a ${emailTarget.email}`, "success", "📧");
      setEmailTarget(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo enviar el correo", "danger", "⚠️");
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <>
      <div className="admin-crm-hero">
        <div>
          <h2 className="admin-crm-hero-title">Clientes y contactos</h2>
          <p className="admin-crm-hero-sub">Mini CRM con datos del checkout y cuentas registradas en la tienda.</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm" disabled={loading} onClick={() => void load()}>
          {loading ? "Actualizando…" : "↻ Actualizar"}
        </button>
      </div>

      <div className="admin-crm-stats">
        <div className="admin-crm-stat-card">
          <span className="admin-crm-stat-num">{stats.totalCustomers}</span>
          <span className="admin-crm-stat-label">Clientes con compra</span>
        </div>
        <div className="admin-crm-stat-card">
          <span className="admin-crm-stat-num">{stats.registeredCount}</span>
          <span className="admin-crm-stat-label">Registrados</span>
        </div>
        <div className="admin-crm-stat-card">
          <span className="admin-crm-stat-num">{stats.guestCount}</span>
          <span className="admin-crm-stat-label">Solo compraron</span>
        </div>
        <div className="admin-crm-stat-card admin-crm-stat-card--accent">
          <span className="admin-crm-stat-num">{stats.wholesaleEligibleCount}</span>
          <span className="admin-crm-stat-label">Elegibles mayorista</span>
        </div>
      </div>

      <div className="admin-crm-toolbar">
        <div className="search-bar admin-crm-search">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por nombre, correo o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-crm-filters">
          {(
            [
              ["all", "Todos"],
              ["registered", "Registrados"],
              ["guest", "Solo compraron"],
              ["wholesale", "Mayorista"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`admin-crm-filter-btn${filter === key ? " active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--dusty-rose)", marginBottom: 16 }}>{error}</p>
      )}

      {loading && customers.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>Cargando clientes…</p>
      ) : filtered.length === 0 ? (
        <div className="admin-card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          {customers.length === 0
            ? "Aún no hay clientes con compras pagadas."
            : "Ningún cliente coincide con la búsqueda o el filtro."}
        </div>
      ) : (
        <div className="admin-crm-grid">
          {filtered.map((c) => {
            const wa = c.phone ? whatsappUrl(c.phone, buildWhatsappPromoMessage(c.name)) : null;
            const expanded = expandedId === c.id;
            return (
              <article key={c.id} className={`admin-crm-card${expanded ? " expanded" : ""}`}>
                <div className="admin-crm-card-head">
                  <div className="admin-crm-avatar" aria-hidden>
                    {customerInitials(c.name)}
                  </div>
                  <div className="admin-crm-card-ident">
                    <h3>{c.name}</h3>
                    <p>{c.email}</p>
                  </div>
                  <div className="admin-crm-badges">
                    <span className={`admin-crm-badge${c.isRegistered ? " registered" : " guest"}`}>
                      {c.isRegistered ? "✓ Registrado" : "Solo compró"}
                    </span>
                    {c.isWholesaleEligible && (
                      <span className="admin-crm-badge wholesale">📦 Mayorista</span>
                    )}
                  </div>
                </div>

                <div className="admin-crm-card-meta">
                  <div>
                    <span className="admin-crm-meta-label">Teléfono</span>
                    <span>{c.phone ?? "—"}</span>
                  </div>
                  <div>
                    <span className="admin-crm-meta-label">Pedidos</span>
                    <span>{c.orderCount}</span>
                  </div>
                  <div>
                    <span className="admin-crm-meta-label">Total gastado</span>
                    <span>{formatPrice(c.totalSpent)}</span>
                  </div>
                  <div>
                    <span className="admin-crm-meta-label">Última compra</span>
                    <span>{c.lastOrderAt ? formatOrderDate(c.lastOrderAt) : "—"}</span>
                  </div>
                </div>

                <div className="admin-crm-card-actions">
                  {wa ? (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm admin-crm-wa">
                      WhatsApp
                    </a>
                  ) : (
                    <button type="button" className="btn btn-outline btn-sm" disabled title="Sin teléfono">
                      WhatsApp
                    </button>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => openEmailModal(c)}>
                    Enviar correo
                  </button>
                  <button
                    type="button"
                    className="btn btn-rose btn-sm"
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                  >
                    {expanded ? "Ocultar historial" : "Ver historial"}
                  </button>
                </div>

                {expanded && (
                  <div className="admin-crm-orders">
                    <h4>Historial de compras</h4>
                    <div className="admin-crm-orders-table-wrap">
                      <table className="admin-table admin-crm-orders-table">
                        <thead>
                          <tr>
                            <th>Referencia</th>
                            <th>Fecha</th>
                            <th>Resumen</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.orders.map((o) => (
                            <tr key={o.id}>
                              <td>{o.reference}</td>
                              <td>{formatOrderDate(o.createdAt)}</td>
                              <td>{o.itemsSummary}</td>
                              <td>{formatPrice(o.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {emailTarget && (
        <div
          className="admin-modal-overlay open"
          role="presentation"
          onClick={(e) => e.target === e.currentTarget && setEmailTarget(null)}
        >
          <div className="admin-modal admin-crm-email-modal">
            <button type="button" className="modal-close" onClick={() => setEmailTarget(null)}>
              ✕
            </button>
            <h3 style={{ fontFamily: "var(--font-display)", marginBottom: 8 }}>Enviar correo</h3>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
              Para: <strong>{emailTarget.name}</strong> · {emailTarget.email}
            </p>

            <div className="admin-crm-templates">
              {EMAIL_TEMPLATES.map((t, i) => (
                <button key={t.label} type="button" className="admin-crm-template-btn" onClick={() => applyTemplate(i)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Asunto</label>
              <input
                className="form-input"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mensaje</label>
              <textarea
                className="form-textarea"
                rows={7}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-rose"
                disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                onClick={() => void handleSendEmail()}
              >
                {emailSending ? "Enviando…" : "📧 Enviar correo"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setEmailTarget(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
