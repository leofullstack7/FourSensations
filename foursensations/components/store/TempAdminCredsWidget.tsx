"use client";

import { useEffect, useState } from "react";

type TempAdminCredsWidgetProps = {
  email: string;
  password: string;
  loginPath?: string;
};

export function TempAdminCredsWidget({
  email,
  password,
  loginPath = "/admin/login",
}: TempAdminCredsWidgetProps) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("fs-hide-admin-creds") === "1") setHidden(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (hidden || !email || !password) return null;

  return (
    <aside className="fs-admin-creds" aria-label="Credenciales temporales de admin">
      <div className="fs-admin-creds__flame" aria-hidden />
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
      <p className="fs-admin-creds__eyebrow">Admin · temporal</p>
      <a className="fs-admin-creds__route" href={loginPath}>
        {loginPath}
      </a>
      <dl className="fs-admin-creds__fields">
        <div>
          <dt>Usuario</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Clave</dt>
          <dd>{password}</dd>
        </div>
      </dl>
    </aside>
  );
}
