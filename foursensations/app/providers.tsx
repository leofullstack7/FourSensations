"use client";

import { SessionProvider } from "next-auth/react";
import { TabAwayTitle } from "@/components/store/TabAwayTitle";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <TabAwayTitle />
      {children}
    </SessionProvider>
  );
}
