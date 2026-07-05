"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { submitAdminCredentialsLogin } from "@/lib/admin/admin-credentials-login";

function adminNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/admin")) return raw;
  return "/admin";
}

export function AdminLoginForm() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const nextPath = adminNextPath(searchParams.get("next"));
  const forbidden = searchParams.get("error") === "forbidden";

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.role !== "ADMIN") return;
    window.location.replace(nextPath);
  }, [status, session, nextPath]);

  return (
    <div className="admin-login-gate">
      <div className="admin-login-bg" aria-hidden>
        <div className="admin-login-orb admin-login-orb--1" />
        <div className="admin-login-orb admin-login-orb--2" />
        <div className="admin-login-grid" />
      </div>
      <div className="admin-login-card">
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
          <label className="form-label">Email del administrador</label>
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ej. admin@ginnabeauty.local"
            autoComplete="username"
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", gap: 10 }}
          disabled={loginSubmitting}
          aria-busy={loginSubmitting}
          onClick={async () => {
            setLoginErr(false);
            setLoginSubmitting(true);
            const result = await submitAdminCredentialsLogin(username, password, nextPath);
            if (!result.ok) {
              setLoginErr(true);
              setPassword("");
              setLoginSubmitting(false);
            }
          }}
        >
          {loginSubmitting && (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.85, ease: "linear" }}
              style={{
                display: "inline-block",
                width: 18,
                height: 18,
                border: "2px solid rgba(255,255,255,0.35)",
                borderTopColor: "rgba(255,255,255,0.95)",
                borderRadius: "50%",
                boxSizing: "border-box",
                flexShrink: 0,
              }}
              aria-hidden
            />
          )}
          {loginSubmitting ? "Entrando…" : "Entrar al panel"}
        </button>
        <Link href="/" style={{ display: "block", marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
          ← Volver a la tienda
        </Link>
        {loginErr && (
          <div style={{ color: "var(--dusty-rose)", fontSize: 13, marginTop: 12 }}>
            Usuario o contraseña incorrectos
          </div>
        )}
      </div>
    </div>
  );
}
