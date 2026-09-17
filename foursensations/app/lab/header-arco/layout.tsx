import { Suspense } from "react";
import { Cormorant_Garamond, DM_Sans, Italiana } from "next/font/google";
import { StoreNavigationProvider } from "@/components/store/StoreNavigationProvider";

const italiana = Italiana({
  subsets: ["latin"],
  weight: "400",
  variable: "--gb-arc-exotic",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--gb-arc-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--gb-arc-sans",
  display: "swap",
});

export default function HeaderArcoLabLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${italiana.variable} ${cormorant.variable} ${dmSans.variable}`}
      style={{ fontFamily: "var(--gb-arc-sans), system-ui, sans-serif" }}
    >
      <Suspense fallback={null}>
        <StoreNavigationProvider>{children}</StoreNavigationProvider>
      </Suspense>
    </div>
  );
}
