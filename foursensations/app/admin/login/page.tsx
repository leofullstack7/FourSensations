import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { TempAdminCredsWidget } from "@/components/store/TempAdminCredsWidget";

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

  const showCreds = process.env.TEMP_ADMIN_CREDS_WIDGET !== "false";
  const email = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@foursensations.com";
  const password = process.env.SEED_ADMIN_PASSWORD?.trim() || "BEfour2026*";

  return (
    <>
      {showCreds ? (
        <TempAdminCredsWidget
          email={email}
          password={password}
          alwaysShow
          showRoute={false}
        />
      ) : null}
      <Suspense fallback={<LoginFallback />}>
        <AdminLoginForm />
      </Suspense>
    </>
  );
}
