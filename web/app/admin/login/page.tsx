import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

function LoginFallback() {
  return (
    <div className="admin-login-gate">
      <p style={{ color: "var(--text-muted)" }}>Cargando…</p>
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
