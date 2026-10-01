import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Four Sensations — Cuidado Capilar & Belleza",
  description:
    "Four Sensations — Marca colombiana de cuidado capilar. El Club de los Cabellos Perfectos. Fórmulas con intención, envíos a todo Colombia.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preload" as="image" href="/brand/splash/logo-fs.webp" type="image/webp" />
        <link rel="preload" as="image" href="/brand/splash/el-club.webp" type="image/webp" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
