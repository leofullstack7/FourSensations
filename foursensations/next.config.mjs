/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Expone el Pull Zone al cliente sin duplicar secretos (solo URL pública). */
  env: {
    NEXT_PUBLIC_BUNNY_CDN_BASE_URL:
      process.env.NEXT_PUBLIC_BUNNY_CDN_BASE_URL || process.env.BUNNY_CDN_BASE_URL || "",
  },
  experimental: {
    /** Evita que Webpack empaquete mal Prisma/bcrypt en rutas RSC (p. ej. /api/auth). */
    serverComponentsExternalPackages: ["@prisma/client", "@auth/prisma-adapter", "bcryptjs"],
  },
  /** Bunny CDN / storage: permite optimización next/image en URLs remotas del catálogo. */
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "**.b-cdn.net", pathname: "/**" },
      { protocol: "https", hostname: "**.bunnycdn.com", pathname: "/**" },
    ],
  },
  async headers() {
    const year = "public, max-age=31536000, immutable";
    const week = "public, max-age=604800, stale-while-revalidate=2592000";
    return [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: year }],
      },
      {
        source: "/_next/image",
        headers: [{ key: "Cache-Control", value: week }],
      },
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: week }],
      },
      {
        source: "/categorias/:path*",
        headers: [{ key: "Cache-Control", value: week }],
      },
      {
        source: "/api/media/:path*",
        headers: [{ key: "Cache-Control", value: week }],
      },
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: week }],
      },
    ];
  },
  /**
   * En Windows, sobre todo con OneDrive/antivirus, la caché incremental de Webpack en `next dev`
   * a veces deja `webpack-runtime.js` apuntando a chunks (`./9161.js`) que ya no existen.
   * Sin caché en desarrollo el arranque es algo más lento pero evita ese fallo intermitente.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
