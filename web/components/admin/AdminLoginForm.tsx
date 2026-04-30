"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const nextPath = searchParams.get("next") || "/admin";
  const forbidden = searchParams.get("error") === "forbidden";

  const redirectIfAuthed = useCallback(() => {
    if (status !== "authenticated") return;
    if (session?.user?.role !== "ADMIN") return;
    router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
    router.refresh();
  }, [status, session, nextPath, router]);

  useEffect(() => {
    void redirectIfAuthed();
  }, [redirectIfAuthed]);

  useEffect(() => {
    router.prefetch("/admin");
  }, [router]);

  return (
    <div className="admin-login-gate">
      <div className="admin-login-card">
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌸</div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 600,
            color: "var(--dark)",
            marginBottom: 4,
          }}
        >
          Ginna<em style={{ color: "var(--dusty-rose)", fontStyle: "italic" }}>Beauty</em>
        </div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 32,
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
            try {
              const res = await signIn("credentials", { username, password, redirect: false });
              if (res?.error) {
                setLoginErr(true);
                setPassword("");
                setLoginSubmitting(false);
                return;
              }
              router.refresh();
              router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
            } catch {
              setLoginErr(true);
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
