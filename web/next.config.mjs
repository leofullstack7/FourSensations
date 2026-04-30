/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
