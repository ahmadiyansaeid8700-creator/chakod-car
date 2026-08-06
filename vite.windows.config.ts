import vinext from "vinext";
import { defineConfig } from "vite";

/**
 * Windows-only local preview.
 *
 * This skips the Cloudflare Vite plugin so local development does not start
 * Miniflare/workerd. Production builds continue to use vite.config.ts.
 */
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/chakod-api": {
        target: "https://api.chakod.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/chakod-api/, ""),
      },
    },
  },
  plugins: [vinext()],
});
