import { Suspense } from "react";
import { StoreNavigationProvider } from "@/components/store/StoreNavigationProvider";
import { TempAdminCredsWidget } from "@/components/store/TempAdminCredsWidget";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const showCreds = process.env.TEMP_ADMIN_CREDS_WIDGET !== "false";
  const email = process.env.SEED_ADMIN_EMAIL?.trim() || "";
  const password = process.env.SEED_ADMIN_PASSWORD?.trim() || "";

  return (
    <Suspense fallback={null}>
      <StoreNavigationProvider>{children}</StoreNavigationProvider>
      {showCreds ? <TempAdminCredsWidget email={email} password={password} loginPath="/admin/login" /> : null}
    </Suspense>
  );
}
