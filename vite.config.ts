import vinext from "vinext";
import { defineConfig } from "vite";

/**
 * Default portable Vite configuration.
 *
 * Cloudflare staging uses vite.cloudflare.config.ts explicitly and cPanel uses
 * vite.cpanel.config.ts. Keeping the default config platform-neutral prevents
 * local or generic Vite commands from depending on removed hosting scaffolds.
 */
export default defineConfig({
  plugins: [vinext()],
});
