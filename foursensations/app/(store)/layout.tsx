import { Suspense } from "react";
import { StoreNavigationProvider } from "@/components/store/StoreNavigationProvider";
import { TempAdminCredsWidget } from "@/components/store/TempAdminCredsWidget";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const showCreds = process.env.TEMP_ADMIN_CREDS_WIDGET !== "false";
  /** Fallbacks: en Render a menudo no están SEED_ADMIN_*; sin ellos el widget no pinta. */
  const email = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@foursensations.com";
  const password = process.env.SEED_ADMIN_PASSWORD?.trim() || "BEfour2026*";

  return (
    <>
      {/* Fuera del Suspense: useSearchParams en el provider suspendía y el fallback null borraba el widget. */}
      {showCreds ? <TempAdminCredsWidget email={email} password={password} loginPath="/admin/login" /> : null}
      <Suspense fallback={null}>
        <StoreNavigationProvider>{children}</StoreNavigationProvider>
      </Suspense>
    </>
  );
}
