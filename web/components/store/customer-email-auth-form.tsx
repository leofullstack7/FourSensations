"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";

export function CustomerEmailAuthForm({
  tab,
  showToast,
  closeAuthModal,
  onBusyChange,
  disabled = false,
}: {
  tab: "login" | "register";
  showToast: (msg: string, type?: string, icon?: string) => void;
  closeAuthModal: () => void;
  onBusyChange?: (label: string | null) => void;
  disabled?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError(null);
  }, [tab]);

  async function parseJson(res: Response): Promise<{ error?: string }> {
    try {
      return (await res.json()) as { error?: string };
    } catch {
      return {};
    }
  }

  const submit = async () => {
    setError(null);
    if (tab === "register") {
      if (!name.trim() || !email.trim() || !password) {
        setError("Completa nombre, correo y contraseña");
        return;
      }
    } else if (!email.trim() || !password) {
      setError("Correo y contraseña requeridos");
      return;
    }

    setLoading(true);
    onBusyChange?.(tab === "register" ? "Creando tu cuenta…" : "Iniciando sesión…");
    try {
      if (tab === "register") {
        const res = await fetch("/api/auth/customer/register", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
        });
        const data = await parseJson(res);
        if (!res.ok) {
          setError(data.error || "No se pudo crear la cuenta");
          return;
        }
      }

      const signInResult = await signIn("customer-credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (!signInResult || signInResult.error || !signInResult.ok) {
        setError(
          tab === "register"
            ? "Cuenta creada, pero no se pudo iniciar sesión. Prueba «Iniciar sesión»."
            : "Correo o contraseña incorrectos",
        );
        return;
      }

      closeAuthModal();
      showToast(
        tab === "register" ? "Cuenta creada. ¡Bienvenida/o!" : "Sesión iniciada correctamente",
        "success",
        "✅",
      );
    } finally {
      setLoading(false);
      onBusyChange?.(null);
    }
  };

  return (
    <>
      {error && (
        <p style={{ color: "var(--dusty-rose)", fontSize: 13, marginBottom: 12, lineHeight: 1.45 }}>{error}</p>
      )}
      {tab === "register" && (
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input
            type="text"
            className="form-input"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={disabled || loading}
          />
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Correo electrónico</label>
        <input
          type="email"
          className="form-input"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          disabled={disabled || loading}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Contraseña</label>
        <input
          type="password"
          className="form-input"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={tab === "register" ? "new-password" : "current-password"}
          disabled={disabled || loading}
        />
      </div>
      <button
        type="button"
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
        disabled={disabled || loading}
        onClick={() => void submit()}
      >
        {loading ? "Procesando…" : tab === "register" ? "Crear cuenta" : "Iniciar sesión"}
      </button>
    </>
  );
}
