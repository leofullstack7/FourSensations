"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { submitAdminCredentialsLogin } from "@/lib/admin/admin-credentials-login";
import { FS_ADMIN_CREDS_FILL_EVENT } from "@/components/store/TempAdminCredsWidget";

function adminNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/admin")) return raw;
  return "/admin";
}

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const credsRef = useRef({ username: "", password: "" });
  credsRef.current = { username, password };

  const nextPath = adminNextPath(searchParams.get("next"));
  const forbidden = searchParams.get("error") === "forbidden";

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.role !== "ADMIN") return;
    window.location.replace(nextPath);
  }, [status, session, nextPath]);

  const runLogin = async (emailOverride?: string, passwordOverride?: string) => {
    const email = (emailOverride ?? credsRef.current.username).trim();
    const pass = passwordOverride ?? credsRef.current.password;
    setLoginErr(null);
    setLoginSubmitting(true);
    try {
      const result = await submitAdminCredentialsLogin(email, pass, nextPath);
      if (!result.ok) {
        if (result.reason === "empty") {
          setLoginErr("Completa email y contraseña");
        } else if (result.reason === "invalid") {
          setLoginErr("Usuario o contraseña incorrectos");
        } else {
          setLoginErr("No se pudo conectar. Revisa tu red o recarga la página.");
        }
        setPassword("");
      }
    } catch {
      setLoginErr("Error inesperado al iniciar sesión. Intenta de nuevo.");
      setPassword("");
    } finally {
      setLoginSubmitting(false);
    }
  };

  useEffect(() => {
    const onFill = (event: Event) => {
      const detail = (event as CustomEvent<{ email?: string; password?: string }>).detail;
      const nextEmail = detail?.email?.trim() || "";
      const nextPassword = detail?.password || "";
      if (!nextEmail || !nextPassword) return;
      setUsername(nextEmail);
      setPassword(nextPassword);
      credsRef.current = { username: nextEmail, password: nextPassword };
      void runLogin(nextEmail, nextPassword);
    };
    window.addEventListener(FS_ADMIN_CREDS_FILL_EVENT, onFill);
    return () => window.removeEventListener(FS_ADMIN_CREDS_FILL_EVENT, onFill);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, [nextPath]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loginSubmitting) return;
    void runLogin();
  };

  return (
    <div className="admin-login-gate">
      <div className="admin-login-bg" aria-hidden>
        <div className="admin-login-orb admin-login-orb--1" />
        <div className="admin-login-orb admin-login-orb--2" />
        <div className="admin-login-grid" />
      </div>
      <form className="admin-login-card" onSubmit={onSubmit} noValidate>
        <BrandLogo variant="auth" />
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
            marginTop: 8,
          }}
        >
          Panel Administrativo
        </div>

        {forbidden && (
          <div
            style={{
              color: "var(--dusty-rose)",
              fontSize: 13,
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Esta cuenta no tiene permisos de administradora. Inicia sesión con el usuario admin creado por el seed.
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label className="form-label" htmlFor="admin-login-email">
            Email del administrador
          </label>
          <input
            id="admin-login-email"
            type="text"
            inputMode="email"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin@foursensations.com"
            autoComplete="username"
            disabled={loginSubmitting}
            required
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label className="form-label" htmlFor="admin-login-password">
            Contraseña
          </label>
          <input
            id="admin-login-password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loginSubmitting}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", gap: 10 }}
          disabled={loginSubmitting}
          aria-busy={loginSubmitting}
        >
          {loginSubmitting && (
            <span
              className="admin-boot-spinner"
              style={{ width: 18, height: 18, borderWidth: 2 }}
              aria-hidden
            />
          )}
          {loginSubmitting ? "Entrando…" : "Entrar al panel"}
        </button>
        <Link href="/" style={{ display: "block", marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
          ← Volver a la tienda
        </Link>
        {loginErr && (
          <div style={{ color: "var(--dusty-rose)", fontSize: 13, marginTop: 12 }} role="alert">
            {loginErr}
          </div>
        )}
      </form>
    </div>
  );
}
