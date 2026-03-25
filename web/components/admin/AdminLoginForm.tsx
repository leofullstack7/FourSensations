"use client";

import Link from "next/link";
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
          style={{ width: "100%", justifyContent: "center" }}
          onClick={async () => {
            setLoginErr(false);
            const res = await signIn("credentials", { username, password, redirect: false });
            if (res?.error) {
              setLoginErr(true);
              setPassword("");
              return;
            }
            router.refresh();
            router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
          }}
        >
          Entrar al panel
        </button>
        <Link href="/" style={{ display: "block", marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
          ← Volver a la tienda
        </Link>
        {loginErr && (
          <div style={{ color: "var(--dusty-rose)", fontSize: 13, marginTop: 12 }}>
            Usuario o contraseña incorrectos
          </div>
        )}
        <div style={{ fontSize: 12, color: "var(--text)", marginTop: 18, lineHeight: 1.55, textAlign: "left" }}>
          <strong style={{ display: "block", marginBottom: 6 }}>Acceso con base de datos</strong>
          El panel solo acepta el usuario <strong>ADMIN</strong> creado con <code>npm run db:seed</code>: el email es el valor de{" "}
          <code>SEED_ADMIN_EMAIL</code> (por defecto <code>admin@ginnabeauty.local</code>) y la contraseña la que definiste en{" "}
          <code>SEED_ADMIN_PASSWORD</code> al ejecutar el seed.
          <br />
          <br />
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
            Si no recuerdas el email, ábrelo en Prisma Studio → tabla <code>User</code> → columna <code>email</code> (rol{" "}
            <code>ADMIN</code>).
          </span>
        </div>
      </div>
    </div>
  );
}
