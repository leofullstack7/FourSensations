"use client";

import { useEffect, useState } from "react";

type TempAdminCredsWidgetProps = {
  email: string;
  password: string;
  loginPath?: string;
  /** En login: siempre visible (ignora el dismiss del home). */
  alwaysShow?: boolean;
  showRoute?: boolean;
};

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 15V7a2 2 0 0 1 2-2h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <dt>{label}</dt>
      <dd className="fs-admin-creds__value">
        <span className="fs-admin-creds__text">{value}</span>
        <button
          type="button"
          className="fs-admin-creds__copy"
          aria-label={copied ? `${label} copiado` : `Copiar ${label.toLowerCase()}`}
          title={copied ? "Copiado" : "Copiar"}
          onClick={() => void copy()}
        >
          {copied ? (
            <span className="fs-admin-creds__copied" aria-hidden>
              ✓
            </span>
          ) : (
            <CopyIcon />
          )}
        </button>
      </dd>
    </div>
  );
}

export function TempAdminCredsWidget({
  email,
  password,
  loginPath = "/admin/login",
  alwaysShow = false,
  showRoute = true,
}: TempAdminCredsWidgetProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (alwaysShow) return;
    try {
      if (sessionStorage.getItem("fs-hide-admin-creds") === "1") setHidden(true);
    } catch {
      /* ignore */
    }
  }, [alwaysShow]);

  if (hidden || !email || !password) return null;

  return (
    <aside className="fs-admin-creds" aria-label="Credenciales temporales de admin">
      <div className="fs-admin-creds__flame" aria-hidden />
      {!alwaysShow ? (
        <button
          type="button"
          className="fs-admin-creds__close"
          aria-label="Ocultar credenciales"
          onClick={() => {
            try {
              sessionStorage.setItem("fs-hide-admin-creds", "1");
            } catch {
              /* ignore */
            }
            setHidden(true);
          }}
        >
          ×
        </button>
      ) : null}
      <p className="fs-admin-creds__eyebrow">Admin · temporal</p>
      {showRoute ? (
        <a className="fs-admin-creds__route" href={loginPath}>
          {loginPath}
        </a>
      ) : null}
      <dl className="fs-admin-creds__fields">
        <CredRow label="Usuario" value={email} />
        <CredRow label="Clave" value={password} />
      </dl>
    </aside>
  );
}
