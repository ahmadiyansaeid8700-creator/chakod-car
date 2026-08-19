import vinext from "vinext";
import { defineConfig } from "vite";

/**
 * Node/cPanel production build.
 *
 * This deliberately omits the Cloudflare Vite plugin and OpenAI Sites plugin.
 * The resulting dist/ directory is served by app.cjs through Passenger.
 */
export default defineConfig({
  plugins: [vinext()],
});
