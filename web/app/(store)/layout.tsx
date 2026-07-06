import { Suspense } from "react";
import { StoreNavigationProvider } from "@/components/store/StoreNavigationProvider";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <StoreNavigationProvider>{children}</StoreNavigationProvider>
    </Suspense>
  );
}
