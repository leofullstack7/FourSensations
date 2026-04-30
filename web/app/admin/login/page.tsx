import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

function LoginFallback() {
  return (
    <div className="admin-login-gate">
      <div style={{ textAlign: "center" }}>
        <div className="admin-boot-spinner" role="status" aria-label="Cargando" />
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Cargando…</p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
