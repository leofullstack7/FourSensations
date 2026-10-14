"use client";

import { SessionProvider } from "next-auth/react";
import { TabAwayTitle } from "@/components/store/TabAwayTitle";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      /** Renueva la sesión en segundo plano mientras la pestaña sigue viva (móvil). */
      refetchInterval={5 * 60}
    >
      <TabAwayTitle />
      {children}
    </SessionProvider>
  );
}
