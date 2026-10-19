"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/api/admin-fetch";

type Props = {
  active: boolean;
  showToast: (msg: string, type?: string) => void;
};

type EmailStatus = {
  provider: {
    active: string;
    canSendToAnyRecipient: boolean;
    hint: string;
    notifyEmail: string | null;
    hasBrevoKey: boolean;
    source: string;
  };
  runtime: {
    source: string;
    hasBrevoKey: boolean;
    notifyEmail: string | null;
    emailFrom: string | null;
  };
  stored: {
    hasBrevoApiKey: boolean;
    brevoApiKeyPreview: string | null;
    notifyEmail: string | null;
    emailFrom: string | null;
  };
};

export function AdminEmailPanel({ active, showToast }: Props) {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [testTo, setTestTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/email-config", {
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as EmailStatus & { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo leer la config de correo");
      setStatus(data);
      setNotifyEmail(data.stored.notifyEmail || data.runtime.notifyEmail || "");
      setEmailFrom(data.stored.emailFrom || data.runtime.emailFrom || "");
      setTestTo(data.runtime.notifyEmail || "");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al cargar correos", "danger");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!active) return;
    void load();
  }, [active, load]);

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (brevoApiKey.trim()) body.brevoApiKey = brevoApiKey.trim();
      if (notifyEmail.trim()) body.notifyEmail = notifyEmail.trim();
      if (emailFrom.trim()) body.emailFrom = emailFrom.trim();
      if (Object.keys(body).length === 0) {
        showToast("Pega la BREVO_API_KEY o cambia el correo de aviso", "default");
        return;
      }
      const res = await adminFetch("/api/admin/email-config", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; provider?: EmailStatus["provider"] };
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setBrevoApiKey("");
      showToast(
        data.provider?.canSendToAnyRecipient
          ? "Correo listo: ya puede llegar a clientas y a la tienda"
          : data.provider?.hint || "Config guardada",
        data.provider?.canSendToAnyRecipient ? "success" : "warning",
      );
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo guardar", "danger");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await adminFetch("/api/admin/email-config", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim() || undefined }),
      });
      const data = (await res.json()) as { error?: string; to?: string; provider?: string };
      if (!res.ok) throw new Error(data.error || "Falló el envío de prueba");
      showToast(`Prueba enviada a ${data.to} vía ${data.provider}`, "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "No se pudo enviar la prueba", "danger");
    } finally {
      setTesting(false);
    }
  };

  const ok = Boolean(status?.provider.canSendToAnyRecipient && status.provider.hasBrevoKey);

  return (
    <div className="admin-card" style={{ padding: 22, maxWidth: 720 }}>
      <h2 className="admin-card-title" style={{ marginTop: 0, marginBottom: 8 }}>
        Correos de pedido
      </h2>
      <p style={{ marginTop: 0, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
        Confirmaciones a la clienta y aviso a la tienda. Resend en modo prueba{" "}
        <strong>no entrega</strong> a Gmail de clientas: usa{" "}
        <a href="https://app.brevo.com" target="_blank" rel="noreferrer">
          Brevo
        </a>{" "}
        (API key + remitente verificado).
      </p>

      {loading && !status ? <p>Cargando…</p> : null}

      {status ? (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 12,
            border: `1px solid ${ok ? "rgba(80,160,120,0.45)" : "rgba(200,120,80,0.45)"}`,
            background: ok ? "rgba(80,160,120,0.08)" : "rgba(200,120,80,0.08)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {ok ? "✓ Correos operativos" : "⚠ Correos no llegan a clientas"}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.45, color: "var(--text-muted)" }}>
            Proveedor: <strong>{status.provider.active}</strong>
            <br />
            {status.provider.hint}
            <br />
            Aviso tienda: {status.runtime.notifyEmail || "—"}
            <br />
            Remitente: {status.runtime.emailFrom || "—"}
            {status.stored.brevoApiKeyPreview ? (
              <>
                <br />
                Brevo guardado: {status.stored.brevoApiKeyPreview}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
          <span style={{ color: "var(--text-muted)" }}>BREVO_API_KEY</span>
          <input
            className="form-input"
            type="password"
            autoComplete="off"
            placeholder={status?.stored.hasBrevoApiKey ? "•••• (ya hay una; pega otra para reemplazar)" : "xkeysib-…"}
            value={brevoApiKey}
            onChange={(e) => setBrevoApiKey(e.target.value)}
          />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
          <span style={{ color: "var(--text-muted)" }}>Correo de aviso (tienda)</span>
          <input
            className="form-input"
            type="email"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            placeholder="pedidosfoursensations@gmail.com"
          />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
          <span style={{ color: "var(--text-muted)" }}>Remitente (debe estar verificado en Brevo)</span>
          <input
            className="form-input"
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
            placeholder='Four Sensations &lt;pedidosfoursensations@gmail.com&gt;'
          />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
            {saving ? "Guardando…" : "Guardar config"}
          </button>
          <button type="button" className="btn btn-outline" disabled={loading} onClick={() => void load()}>
            Actualizar estado
          </button>
        </div>
      </div>

      <hr style={{ margin: "22px 0", border: 0, borderTop: "1px solid var(--line)" }} />

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Enviar correo de prueba</div>
        <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
          <span style={{ color: "var(--text-muted)" }}>Para</span>
          <input
            className="form-input"
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="tu@gmail.com"
          />
        </label>
        <button type="button" className="btn btn-primary btn-sm" disabled={testing} onClick={() => void sendTest()}>
          {testing ? "Enviando…" : "Enviar prueba"}
        </button>
      </div>
    </div>
  );
}
