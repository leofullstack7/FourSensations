import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
