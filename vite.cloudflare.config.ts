import vinext from "vinext";
import { defineConfig } from "vite";

/**
 * Standalone Cloudflare Workers build.
 *
 * This intentionally does not import the Site Creator injected files used by
 * vite.config.ts (`.openai/hosting.json` and `build/sites-vite-plugin`). It is
 * used by the dedicated staging Worker created in the Cloudflare dashboard.
 * The production/Sites build continues to use vite.config.ts unchanged.
 */
export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          name: process.env.CLOUDFLARE_WORKER_NAME || "chakod-car-staging",
          main: "./worker/index.ts",
          compatibility_date: "2026-08-07",
          compatibility_flags: ["nodejs_compat"],
          assets: {
            binding: "ASSETS",
          },
          images: {
            binding: "IMAGES",
          },
        },
      }),
    ],
  };
});
