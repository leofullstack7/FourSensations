import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "GinnaBeauty — Cosmética & Cuidado Premium",
  description:
    "GinnaBeauty — Tu destino de belleza premium. Cosméticos, cuidado de piel, capilar y más con envío a todo Colombia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
